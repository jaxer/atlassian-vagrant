define('feature/filebrowser/file-finder', [
    'aui',
    'jquery',
    'underscore',
    'util/events',
    'util/ajax',
    'util/function',
    'util/navbuilder',
    'util/regexp',
    'model/path',
    'widget/keyboard-controller',
    'widget/paged-scrollable',
    'exports'
], function (
    AJS,
    $,
    _,
    events,
    ajax,
    fn,
    nav,
    regexp,
    Path,
    keyboardController,
    PagedScrollable,
    exports
) {
    var ListKeyboardController = keyboardController.ListKeyboardController;

    function getRestFileFinderUrl(revision) {
        var find = nav
            .rest()
            .currentRepo()
            .files()
            .all()
            .at(revision.getId());
        return find.build();
    }

    function getFileUrl(path, revision) {
        var browse = nav
            .currentRepo()
            .browse()
            .path(path);

        if (!revision.isDefault()) {
            browse = browse.at(revision.getDisplayId());
        }

        return browse.build();
    }


    function lowerToCaseInsensitive(chr) {
        return (chr !== chr.toUpperCase()) ? '['+ regexp.escape(chr.toUpperCase() + chr) +']' : regexp.escape(chr);
    }

    // Trim leading, trailing and multiple spaces.
    function trimSpaces(s) {
        return s.replace(/(^\s*)|(\s*$)/gi,"")
            .replace(/[ ]{2,}/gi," ");
    }

    function getPattern(filter) {
        if (filter) {

            var patternStr = '',
                splitFilter = trimSpaces(filter).split(/\*|\s|(?=[A-Z0-9]|\/|\.|-|_)/g);

            //Remove empty strings
            splitFilter = _.filter(splitFilter, fn.not(_.isEmpty));

            var splitLength = splitFilter.length;
            if (splitLength) {
                patternStr += '(' + _.map(splitFilter[0].split(''), lowerToCaseInsensitive).join('') + ')';
                for (var i = 1; i < splitLength; i++) {
                    patternStr += '.*?' + '(' + _.map(splitFilter[i].split(''), lowerToCaseInsensitive).join('') + ')';
                }

                return new RegExp('(' + patternStr + ')', 'g');
            }
        }
        return null;
    }

    function highlightMatches(pattern, str) {
        str = AJS.escapeHtml(str);
        return pattern ? str.replace(pattern, '<strong>$1</strong>') : str;
    }

    function FileFinder(container, revisionRef) {
        var self = this;
        this._isLoaded = false;
        this.fileTableSelector = container;
        this.currentRevisionRef = revisionRef;
        this.resultSetId = 0;
        this.$fileFinderInput = $(".file-finder-input");
        this.$textInput = $("input.filter-files");
        this.$finderTip = $('#file-finder-tip');
        this.$spinner = $("<div class='spinner'/>").hide().insertAfter(this.fileTableSelector);

      events.on('stash.page.filebrowser.revisionRefChanged', function(revisionRef) {
            self.currentRevisionRef = revisionRef;
            self.files = undefined; //Clear cache as the revision has changed, we need to re-request
        });
    }

    // Not final yet, needs more thought
    FileFinder.prototype.tips = [
        stash_i18n("stash.web.filefinder.tip.1", "Filter by directory path e.g. ''<strong>/ssh pom.xml</strong>'' to search for ''src<strong>/ssh/pom.xml</strong>''."),
        stash_i18n("stash.web.filefinder.tip.2", "Use camelCasing e.g. ''<strong>ProjME</strong>'' to search for ''<strong>ProjectModifiedE</strong>vent.java''."),
        stash_i18n("stash.web.filefinder.tip.3", "Filter by extension type e.g. ''<strong>/repo .js</strong>'' to search for all ''<strong>.js</strong>'' files in the ''<strong>/repo</strong>'' directory."),
        stash_i18n("stash.web.filefinder.tip.4", "Separate your search with spaces e.g. ''<strong>/ssh pom.xml</strong>'' to search for ''src<strong>/ssh/pom.xml</strong>''."),
        stash_i18n("stash.web.filefinder.tip.5", "Use ↑ and ↓ arrow keys to navigate and ''<strong>return</strong>'' to view the file.")
    ];

    FileFinder.prototype._bindKeyboardNavigation = function() {
        this._filesKeyboardController = new ListKeyboardController(this.$textInput, $(this.fileTableSelector), {
            wrapAround: false,
            focusedClass : 'focused-file',
            itemSelector : 'tr.file-row',
            onSelect : function($focused) {
                window.location.href = $focused.find('a').attr('href');
            },
            requestMore : function() {
                var promise = $.Deferred();
                window.scrollTo(0, document.documentElement.scrollHeight);
                setTimeout(function() {
                    promise.resolve();
                });
                return promise;
            }
        });
    };

    FileFinder.prototype._showSpinner = function() {
        $('.filebrowser-banner').empty();
        $(this.fileTableSelector).empty();
        this.$spinner.show().spin('large');
    };

    FileFinder.prototype._hideSpinner = function() {
        this.$spinner.spinStop().hide();
    };

    FileFinder.prototype.isLoaded = function () {
        return this._isLoaded;
    };

    FileFinder.prototype.unloadFinder = function () {
        $('.breadcrumbs').removeClass('file-finder-mode');
        this.$textInput.blur().hide().val('');
        this.$fileFinderInput.removeClass('visible');
        this.$finderTip.removeClass('visible');
        this._isLoaded = false;
        if (this._filesKeyboardController) {
            this._filesKeyboardController.destroy();
            this._filesKeyboardController = null;
        }
        this.tableView.reset();
    };

    FileFinder.prototype.loadFinder = function () {
        $('.filebrowser-banner').empty();
        $('.breadcrumbs').addClass('file-finder-mode');
        this.$textInput.focus();
        if (!this._isLoaded) {
            this.requestFiles();
            this._isLoaded = true;
        }
    };

    FileFinder.prototype.requestFiles = function () {
        var self = this;

        this._showSpinner();
        if (this.files) {
            // Files have already been loaded
            this.onFilesLoaded();

            // slightly hacky since we don't do a request but it triggers a re-layout fixing an overlap in IE in narrow res
            this._hideSpinner();
        } else {
            ajax.rest({
                url: getRestFileFinderUrl(self.currentRevisionRef)
            }).done(function(data) {
                var files = data.values;
                self.files = [];
                for (var i = 0; i < files.length; i++) {
                    self.files.push({
                        name: files[i]
                    });
                }
                self.onFilesLoaded();
            }).always(function() {
                self._hideSpinner();
            });
        }
    };

    FileFinder.prototype.onFilesLoaded = function () {
        var self = this;
        this.$fileFinderInput.addClass('visible');
        this.$textInput.show();
        var randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];
        this.$finderTip.html(stash_i18n('stash.web.filefinder.tip.label', 'Tip: ') + randomTip).addClass('visible');
        this.showFiles();
        this._bindKeyboardNavigation();
        this._filesKeyboardController.moveToNext();

        var $input = this.$textInput,
            inputVal = $input.val();

        function filterAndSelect(filter) {
            self.showFiles(filter);
            self._filesKeyboardController.setListElement($(self.fileTableSelector));
            self._filesKeyboardController.moveToNext();
        }

        //Unbind first in case the input has remained visible across multiple directory visits
        this.$textInput.unbind('keyup').on('keyup', function(e) {
            if (e.keyCode === 27) {
                events.trigger('stash.feature.filetable.hideFind', self);
            }
        }).on('keyup', _.debounce(function (e) {
            if (e.keyCode !== 27 && inputVal !== (inputVal = $input.val())) {
                filterAndSelect($(this).val());
            }
        }, 200)).focus();

        //Filter and select if there was
        if (inputVal) {
            filterAndSelect(inputVal);
        }
    };

    FileFinder.prototype.showFiles = function (filter) {
        this.filteredFiles = this.files;

        var pattern = getPattern(filter);

        if (this.tableView) {
            //kill the old table view - ensuring it unbinds document listeners
            this.tableView.reset();
        }
        //Filter files upfront since all files are pre-fetched anyway
        if (pattern && this.files.length > 0) {
            this.filteredFiles = _.filter(this.files, function (f) {
                pattern.lastIndex = 0;
                return pattern.test(f.name);
            });
            pattern.lastIndex = 0;

            // Don't sort in IE8
            if (!$.browser.msie || parseInt($.browser.version, 10) >= 9) {

                //matches the filter pattern but only where there are no following /
                var filenamePattern = new RegExp(pattern.source + "(?!.*/)");
                var exactMatches = function(file) {
                    /*jshint boss:true */
                    if (file.exactMatches) {
                        return file.exactMatches;
                    }
                    return (file.exactMatches = (file.name.indexOf(filter) >= 0));
                };
                var filenameMatches = function(file) {
                    /*jshint boss:true */
                    if (file.matches) {
                        return file.matches;
                    }
                    return (file.matches = filenamePattern.test(file.name));
                };

                this.filteredFiles.sort(function(f1, f2) {
                    var f1ExactMatch = exactMatches(f1),
                        f2ExactMatch = exactMatches(f2);

                    if (f1ExactMatch !== f2ExactMatch) {
                        return f1ExactMatch ? -1 : 1;
                    }

                    var f1FilenameMatches = filenameMatches(f1),
                        f2FilenameMatches = filenameMatches(f2);

                    if (f1FilenameMatches === f2FilenameMatches) {
                        return f1.name.localeCompare(f2.name);
                    }

                    return f1FilenameMatches ? -1 : 1;
                });
            }
        } else {
            _.forEach(this.files, function(f) {
                f.highlightedName = null;
                f.matches = null;
                f.exactMatches = null;
            });
        }

        this._makeFileFinderView(pattern);
    };

    FileFinder.prototype._makeFileFinderView = function(pattern) {
        this.tableView = new FileFinderTableView(this.filteredFiles, pattern, this.fileTableSelector,
            this.currentRevisionRef, this.resultSetId++);
        //Load the first 50 elements
        this.tableView.init();

    };

    function FileFinderTableView(files, pattern, fileTableSelector, revisionRef, resultSetId) {
        PagedScrollable.call(this, null, { pageSize : 50 });
        this.pattern = pattern;
        this.fileTableSelector = fileTableSelector;
        this.filteredFiles = files;
        this.currentRevisionRef = revisionRef;
        this.resultSetId = resultSetId;
    }

    $.extend(FileFinderTableView.prototype, PagedScrollable.prototype);

    FileFinderTableView.prototype.requestData = function(start, limit) {
        var self = this,
            slice = this.filteredFiles.slice(start, start + limit);

        _.forEach(slice , function(f) {
            if (!f.url) {
                f.url = getFileUrl(new Path(f.name), self.currentRevisionRef);
            }
            f.highlightedName = highlightMatches(self.pattern, f.name);
        });
        return $.Deferred().resolve({
            values: slice,
            size: slice.length,
            isLastPage: (start + limit) >= this.filteredFiles.length
        });
    };

    FileFinderTableView.prototype.attachNewContent = function(data, attachmentMethod) {
        var $tableContainer = $(this.fileTableSelector);
        if (attachmentMethod === 'html') {
            var $html = $(stash.feature.filefinder.fileFinderTable({
                files: data.values,
                resultSetId: this.resultSetId
            }));
            $tableContainer.replaceWith($html);
        } else {
            var append = attachmentMethod === 'append',
                $tbody = $($tableContainer, 'table > tbody');

            _.each(data.values, function(file) {
                var $row = $(stash.feature.filefinder.fileFinderRow($.extend({}, file, { name: file.highlightedName })));
                if (append) {
                    $tbody.append($row);
                } else {
                    $tbody.prepend($row);
                }
            });
        }
    };

    exports.FileFinder = FileFinder;

    // Visible for testing
    FileFinder.highlightMatches = highlightMatches;
    FileFinder.getPattern = getPattern;
});