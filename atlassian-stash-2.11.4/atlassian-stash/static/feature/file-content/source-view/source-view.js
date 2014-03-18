define('feature/file-content/source-view', [
    'jquery',
    'underscore',
    'util/events',
    'aui',
    'util/dom-event',
    'util/ajax',
    'util/error',
    'util/function',
    'util/navbuilder',
    'util/html',
    'util/promise',
    'model/file-change',
    'model/file-content-modes',
    'widget/paged-scrollable',
    'widget/loaded-range',
    'feature/file-content/binary-view',
    'feature/file-content/file-blame',
    'feature/file-content/determine-language'
], function (
    $,
    _,
    events,
    AJS,
    domEventUtil,
    ajax,
    errorUtil,
    fn,
    navBuilder,
    htmlUtil,
    promise,
    FileChange,
    FileContentModes,
    PagedScrollable,
    LoadedRange,
    binaryView,
    FileBlame,
    determineLanguage
) {

    domEventUtil.listenForFontSizeChange();

    var isSyntaxHighlightingDisabled = $.browser.msie && parseInt($.browser.version, 10) < 9,
        stripsWhitespaceOutsidePreTags = $.browser.msie && parseInt($.browser.version, 10) < 9,
        fullLineEnd = stripsWhitespaceOutsidePreTags ? '<br /></pre>' : '<br />',
        truncatedLineEnd = '<span title="'+ stash_i18n('stash.web.source.line.truncated', 'This line has been truncated.') + '">&hellip;</span>' + fullLineEnd,
        lineOpts = {
            lineStart : stripsWhitespaceOutsidePreTags ? '<pre>' : '',
            lineEnd : function(line) {
                return line.truncated ? truncatedLineEnd : fullLineEnd;
            },
            emptyLine : ''
        },
        isIE9 = $.browser.msie && Math.floor(parseInt($.browser.version, 10)) === 9,
        pageSize = $.browser.msie ? 1000 : 5000,
        maxLinesDisplayed = 20000;


    function getData(path, untilRevision, params) {
        var restUrl = navBuilder.currentRepo().browse().path(path).at(untilRevision.getDisplayId()).build();

        return ajax.rest({
            url: restUrl,
            data: params,
            statusCode: ajax.ignore404WithinRepository(function (data) {
                // Need to resolve instead of reject to stop at _this_ file handler
                return $.Deferred().resolve(data);
            })
        });
    }

    var NO_HIGHLIGHT_LANGUAGE = "text";

    function lineToHtml(line) {
        var lineHtml = AJS.escapeHtml(line.text);
        return lineOpts.lineStart + (lineHtml || lineOpts.emptyLine) + lineOpts.lineEnd(line);
    }

    function lineArrayToHtml(lines) {
        return _.map(lines, lineToHtml).join('');
    }

    function lineNumbersToHtml(start, size) {
        var html = '';
        for (var i = start, end = start + size; i < end; i++) {
            html += '<pre id="l' + i + '"><a href="#' + i + '">' + i + '</a></pre>';
        }
        return html;
    }

    function SourceView(data, options) {
        PagedScrollable.call(this, options.$scrollPane, {
            pageSize: pageSize,
            dataLoadedEvent: 'stash.feature.sourceview.dataLoaded'
        });

        var fileChange = new FileChange(options.fileChange);

        this.$table = $(options.$container);
        this.$linesContainer = this.$table.children('.line-numbers');
        this.$linesBlock = this.$linesContainer.children('.numbers');
        this.$sourceBlock = this.$table.find('.code');
        this.$source = $('<code />').appendTo(this.$sourceBlock);
        var $blameButton = this.$table.closest('.file-content').find('.file-blame');
        this.blame = new FileBlame($blameButton, this.$table, fileChange.getPath(), fileChange.getCommitRange().getUntilRevision());
        this.$viewRaw = $('.raw-view-link');

        // Bottom padding on the table cells so the scrollbar doesn't cover anything
        this.scrollbarPadding = 0;

        if (isIE9) {
            this.$table.addClass('padded-scrollbar');
            this.scrollbarPadding = parseInt(this.$linesBlock.css('padding-bottom'), 10);
        }

        this.initialData = data;
        this.init(fileChange, options);
    }
    $.extend(SourceView.prototype, PagedScrollable.prototype);

    SourceView.prototype.init = function(fileChange, options) {
        var targetedLine = options && options.targetLine;

        this.fileChange = fileChange;
        this.startingLine = targetedLine != null ? Math.min(targetedLine + 1, maxLinesDisplayed) : null;

        var self = this;
        this.includeBlame = function (isEnabled) {
            if (this === self.blame) {
                self.includeBlame = isEnabled;
            }
        };
        events.on('stash.feature.fileblame.enabledStateChanged', this.includeBlame);

        return PagedScrollable.prototype.init.call(this, {targetedItem: targetedLine, loadedRange: new LoadedRange(maxLinesDisplayed)});
    };

    // in Chrome:
    // quickEmpty 5000 lines - 70ms
    // $node.empty() - 350ms

    // WARNING: Only use if you can guarantee that no data or event listeners are stored against this node or any of its children.
    // Using this otherwise will cause a memory leak
    function quickEmpty(node) {
        while(node.hasChildNodes()) node.removeChild(node.firstChild);
    }

    SourceView.prototype.reset = function() {
        this.startingLine = 0;

        this.fileChange = undefined;
        this.language = undefined;
        this.blame = undefined;
        this.$viewRaw = undefined;

        quickEmpty(this.$linesBlock[0]);
        quickEmpty(this.$source[0]);

        this.fontSizeHandler && events.off('stash.util.events.fontSizeChanged', this.fontSizeHandler);
        events.off('stash.feature.fileblame.enabledStateChanged', this.includeBlame);
        events.off('stash.page.source.requestedRevisionData', this.onRequestedRevisionData);

        this.$linesBlock.off('click.source-view', 'a');

        PagedScrollable.prototype.reset.call(this);
    };

    SourceView.prototype.destroy = function() {
        this.reset();
        if (this.$overCapacityMessage) {
            this.$overCapacityMessage.remove();
            this.$overCapacityMessage = null;
        }
    };

    //@Override
    SourceView.prototype.requestData = function (start, limit) {
        if (start === 0 && this.initialData) {
            try {
                if (this.initialData.errors) {
                    return $.Deferred().rejectWith(this, [this, null, null, this.initialData]);
                }
                return $.Deferred().resolve(this.initialData);
            } finally {
                this.initialData = null;
            }
        }
        var $spinner = $("<div />").addClass('file-content-spinner').appendTo($('.source-view'));
        return promise.spinner($spinner,
            loadData(this.fileChange, this.includeBlame, start, limit),
            'large'
        );
    };

    function loadData(fileChange, includeBlame, start, limit) {
        var data = {
            start: start,
            limit: limit
        };

        if (includeBlame) {
            data.blame = true;
        }

        return getData(fileChange.getPath(), fileChange.getCommitRange().getUntilRevision(), data);
    }

    SourceView.prototype.disableBlame = function() {
        this.blame.setButtonEnabled(false);
        this.blame.setEnabled(false);
    };

    SourceView.prototype.handleErrors = function(errors) {
        if (errors) {
            this.$source.prepend(_.reduce(errors, function(seed, error) {
                var messageText = error && error.message || stash_i18n('stash.web.source.error.unknown', 'Source could not be loaded');
                var message = widget.aui.message.warning({
                    content : AJS.escapeHtml(messageText)
                });
                return seed + message;
            }, ''));
            events.trigger('stash.feature.sourceview.onError', this, { errors : errors });
            this.disableBlame();
            this.$viewRaw.attr('disabled', true);
        }
    };

    SourceView.prototype.onBinary = function (data) {
        var $container = this.$table.find(".binary-container");
        binaryView.renderBinaryFile($("<div>"), data.path, this.fileChange.getCommitRange())
            .appendTo($container);
        events.trigger('stash.feature.sourceview.onBinary', this, { path : data.path });
        this.disableBlame();
    };

    SourceView.prototype.onEmptyFile = function (data) {
        this.$table.addClass("empty-file").html(stash.feature.fileContent.emptyFile());
        events.trigger('stash.feature.sourceview.onEmptyFile', this, data);
        this.disableBlame();
    };

    //@Override
    SourceView.prototype.onDataLoaded = function (start, limit, data) {

        if (data.errors) {
            this.handleErrors(data.errors);
            return;
        }
        var self = this;

        if (binaryView.shouldRenderBinary(data)) {
            this.$table
                .find(".source-container, .line-numbers").hide()
                .end()
                .find(".binary-container").show();
            this.onBinary(data);
        } else if (data.lines && data.lines.length === 0) {
            this.$table
                .find(".source-container, .line-numbers").show()
                .end()
                .find(".binary-container").hide().empty();
            this.onEmptyFile(data);
        } else {
            this.blame.setButtonEnabled(true);
            this.$viewRaw.attr('disabled', false);
            PagedScrollable.prototype.onDataLoaded.call(this, start, limit, data);
            this.blame.onDataLoaded(start, limit, data);
        }

        if (self.loadedRange.reachedEnd() || data.binary) {
            self.$table.addClass('fully-loaded');
            if (self.loadedRange.reachedCapacity() && !self.$overCapacityMessage) {
                self.$overCapacityMessage = $(widget.aui.message.warning({
                    content : stash_i18n('stash.web.source.overcapacity',
                        'This file is too large to render. <a href="{0}">Download the full file</a>.',
                        navBuilder.currentRepo().browse()
                            .path(self.fileChange.getPath()).at(self.fileChange.getUntilRevision().getId()).raw().build()
                    )
                }));
                self.$table.after(self.$overCapacityMessage);
            }
        }
    };

    //@Override
    SourceView.prototype.attachNewContent = function (data, attachmentMethod) {

        var language = this.language = this.language || (isSyntaxHighlightingDisabled ?
                    NO_HIGHLIGHT_LANGUAGE :
            determineLanguage.fromFileInfo({
                firstLine: data.lines[0].text,
                path: this.fileChange.getPath().toString(),
                legacy: true
            }) || NO_HIGHLIGHT_LANGUAGE);

        var codeHtml;
        if (language === NO_HIGHLIGHT_LANGUAGE) {
            codeHtml = lineArrayToHtml(data.lines);
        } else {
            var code = _.map(data.lines, fn.dot('text')).join('\n') + '\n',
                highlightedCode = hljs.highlight(language, code).value;

            codeHtml = htmlUtil.mergeStreams(code, htmlUtil.lineNodeStream(data.lines, null, lineOpts), htmlUtil.highlightJsNodeStream(highlightedCode))
                .replace(/\n/g, '');
        }

        htmlUtil.quickNDirtyAttach(this.$source[0], codeHtml, attachmentMethod);

        if (attachmentMethod === 'prepend') {
            this._resizePlaceholder();
        }
        htmlUtil.quickNDirtyAttach(this.$linesBlock[0], lineNumbersToHtml(Number(data.start) + 1, Number(data.size)), attachmentMethod);
    };

    SourceView.prototype._resizePlaceholder = function() {
        var self = this,
            loadedStart = self.loadedRange.start,
            loadedEnd = self.loadedRange.nextPageStart;

        if (loadedStart > 0) {
            var lineBlock = self.$linesBlock[0],
                scrollbarPadding = self.scrollbarPadding,
                $placeholder;

            if (!($placeholder = self.$precedingSourcePlaceholder)) {
                $placeholder = self.$precedingSourcePlaceholder = $('<div/>').prependTo(self.$sourceBlock).add($('<div/>').prependTo(self.$linesContainer));
            }

            //set the placeholder height to 0 to avoid it affecting the lineBlock height when we grab that later.
            $placeholder.height(0);
            $placeholder.height(((lineBlock.offsetHeight - scrollbarPadding) / (loadedEnd - loadedStart)) * loadedStart);
            $placeholder.addClass('source-placeholder');

        } else if (self.$precedingSourcePlaceholder) {
            self.$precedingSourcePlaceholder.remove();
            self.$precedingSourcePlaceholder = null;
        }
    };

    //@Override
    SourceView.prototype.onFirstDataLoaded = function (start, limit, data) {

        var self = this;

        // Currently, we are adding all previous line numbers to the DOM when you deep link.
        // We do that when we render the deeplinked page
        if (start > 0) {
            this._resizePlaceholder();
        }

        events.on('stash.util.events.fontSizeChanged', this.fontSizeHandler = function() { self._resizePlaceholder(); });

        if (this.startingLine) {
            this.selectLine(this.startingLine, true);
        }

        this.$linesBlock.on('click.source-view', 'a', function () {
            var line = this.parentNode.id.match(/\d+/)[0];
            events.trigger('stash.feature.sourceview.selectedLineChanged', self, line);
            self.selectLine(line);
        });

        if (isSyntaxHighlightingDisabled && data.lines.length) {
            var language = determineLanguage.fromFileInfo({
                firstLine: data.lines[0].text,
                path: self.fileChange.getPath().toString(),
                legacy: true
            }) || NO_HIGHLIGHT_LANGUAGE;

            if (language !== NO_HIGHLIGHT_LANGUAGE) {
                var $syntaxHighlightWarning = $(stash.feature.fileContent.syntaxHighlightToolbarWarning()).appendTo('.file-toolbar .primary');
                new AJS.InlineDialog($syntaxHighlightWarning.find('.dialog-trigger'), 'highlight-demo', function(contents, trigger, showPopup) {

                    var $container = $('<div class="syntax-highlight-warning-dialog"></div>');
                    $container.html(stash_i18n(
                        'stash.web.sourceview.warning.nosyntaxhighlight.detail',
                        'Syntax highlighting is not supported in Internet Explorer 8. For a better experience, consider {0}upgrading your browser{1}.',
                        '<a href="http://www.browseryoulovedtohate.com" target="_blank">',
                        '</a>'
                    ));

                    contents.html($container);
                    showPopup();
                }, {
                    hideDelay : 500,
                    width : 350
                });
            }
        }

        PagedScrollable.prototype.onFirstDataLoaded.call(this);
    };

    SourceView.prototype.selectLine = function(lineNumber, initialPageLoad) {
        var $lineLink = this.$lineLink;
        if ($lineLink) {
            $lineLink.removeClass('target');
        }

        if (lineNumber) {
            $lineLink = this.$lineLink = this.$linesBlock.find('#l' + lineNumber);
            if ($lineLink.length) {
                // put the line at the top third.
                this.$scrollElement.scrollTop($lineLink.offset().top - ($(window).height() / 4));
                $lineLink.addClass('target');

                if (initialPageLoad) {
                    $lineLink.addClass('initial-target');
                }
            }
        }
    };

    SourceView.fileHandler = function (options) {
        var isSource = options.contentMode === FileContentModes.SOURCE;
        return isSource && loadData(new FileChange(options.fileChange), false, 0, pageSize).then(function (data) {
            return new SourceView(data, options);
        }, function (xhr, textStat, errorThrown, data) {
            if (data && data.errors && errorUtil.isErrorEntityWithinRepository(data.errors[0])) {
                // we error'd out, but we did so in a way we can handle here.
                return $.Deferred().resolve(new SourceView(data, options));
            }
            return $.Deferred().rejectWith(this, arguments);
        });
    };

    return SourceView;
});

require('stash/api/feature/files/file-handlers').register({
    weight: 10000,
    extraClasses: 'source-file-content',
    handle: function (options) {
        return require('feature/file-content/source-view').fileHandler.apply(this, arguments);
    }
});
