define('feature/file-content/unified-diff-view', [
    'jquery',
    'underscore',
    'util/deprecation',
    'util/events',
    'util/function',
    'feature/comments',
    'feature/file-content/diff-view',
    'feature/file-content/diff-view-context',
    'feature/file-content/diff-view-segment-types',
    'feature/file-content/line-handle',
    'feature/file-content/diff-view-file-types'
],
/**
 * Implement the Unified Diff view for diffs.
 *
 * We use CodeMirror for rendering our code.
 *
 * @exports feature/file-content/unified-diff-view
 */
function(
    $,
    _,
    deprecate,
    events,
    fn,
    comments,
    DiffView,
    diffViewContext,
    diffViewSegmentTypes,
    StashLineHandle,
    DiffFileTypes
) {
    'use strict';

    /**
     * Add destination and source line numbers to individual lines in a context hunk
     *
     * @param {Object} hunk
     */
    function addContextLineNumbers(hunk) {
        var destinationStart = hunk.destinationLine;
        var sourceStart = hunk.sourceLine;

        hunk.segments[0].lines = _.map(hunk.segments[0].lines, function(line, index) {
            line.destination = destinationStart++;
            line.source = sourceStart++;
            return line;
        });

        return hunk;
    }

    /**
     * Add the hunk separators in the diff view.
     *
     * We'll work out the hunk separators and add them to the correct place in the editor.
     *
     * @param {UnifiedDiffView} diffView
     * @param {ContentChange} change
     */
    function addSeparators(diffView, change) {
        if (!change.linesAdded) {
            return;
        }

        var diff = change.diff;

        var separators = diffViewContext.getSeparatedHunkHtml(diff.hunks, diffView.options.fileChange.getType());
        var endSeparator;

        var firstHunkHandles = [];
        var lastLineHandle;
        var prevHunk;
        change.eachLine(function(data) {
            var handle = data.handles.FROM || data.handles.TO;
            if (data.hunk !== prevHunk) {
                prevHunk = data.hunk;
                firstHunkHandles.push(handle);
            }
            lastLineHandle = handle;
        }).done(function() {
            switch(change.type) {
                case 'INSERT':
                    var firstHandle = firstHunkHandles[0];
                    var firstIndex = diffView._editor.getLineNumber(firstHandle._handle);
                    var isTop = firstIndex === 0;
                    // we want the previous last line index as this would be the line
                    // where the last separator was located before the new content was added.
                    var previousLastIndex = diffView._editor.lastLine() - change.linesAdded;
                    var isBottom = firstIndex > previousLastIndex;

                    /**
                     * Case: 2 hunks
                     *
                     * --- separator --- (never keep)
                     * hunk
                     * --- separator --- (always keep)
                     * hunk
                     * --- separator --- (never keep)
                     *
                     *
                     * Case: 1 hunk
                     * --- separator --- (keep when injecting before first line)
                     * hunk
                     * --- separator --- (keep when injecting after last line)
                     */

                    if (diff.hunks.length > 1) {
                        firstHunkHandles.shift();
                        separators.shift();
                        separators.pop();
                        lastLineHandle = undefined;
                    } else {
                        if (!isTop) {
                            firstHunkHandles.shift();
                            separators.shift();
                        }
                        if (!isBottom) {
                            separators.pop();
                            lastLineHandle = undefined;
                        } else {
                            endSeparator = separators.pop();
                        }
                    }
                    break;
                case 'INITIAL':
                    if (firstHunkHandles.length === separators.length - 1) {
                        endSeparator = separators.pop();
                    }
                    break;
                default:
                    throw new Error('Unrecognized change type: ' + change.type);
            }

            _.each(_.zip(separators, firstHunkHandles), fn.spread(_.partial(addHunkSeparator, diffView, !!'isAbove')));

            // The end separator:
            // Because there are no more lines below the last separator, we need to make it part of the last line.
            // while this seems like something that makes sense, you must also realise that normally a separator
            // is the first item in a hunk, and is displayed _above_ the _first_ line in a hunk.
            if (endSeparator) {
                addHunkSeparator(diffView, !'isAbove', endSeparator, lastLineHandle);
            }
        });
    }

    function addHunkSeparator(diffView, isAbove, separatorHtml, handle) {
        if (!separatorHtml) {
            return;
        }
        var $separator = $(separatorHtml);
        var widget = diffView.addLineWidget(handle, $separator[0], {
            coverGutter : true,
            noHScroll : true,
            above: isAbove
        });
        if (isAbove) {
            diffView.addLineClass(handle, 'wrap', 'first-line-of-hunk');
        }

        // Add a handle to the node so that when we need to remove this widget, we can do so via the editor API
        $separator.data('widget', widget);
    }

    /**
     * Remove a separator widget by calling its `clear` method.
     *
     * @param {CodeMirror.LineWidget} widget
     * @returns {*}
     */
    function removeSeparatorWidget(widget) {
        widget && widget.clear();
    }

    function insertContext(unifiedDiffView, text, at) {
        var isChangeAtLastLine = unifiedDiffView._editor.lastLine() === at;
        var isChangeAtFirstLine = 0 === at;

        // If we're at the last line, we need to increase the line at which we want to insert the content by 1.
        // We do this because we want the content to be injected after the content of the last line because the
        // separator for the last line belongs to the last line, rather than the line after it.
        var insertionOffset = isChangeAtLastLine ? 0 : -1;

        //
        // # A note about content insertion positions
        //
        // While the CodeMirror 'wholeLineUpdateBefore' option sounds like what you need, realise that it just
        // makes CodeMirror behave more consistently when adding lines that have a trailing newline.
        // When this is set to `true` and you insert content with a trailing newline on to a blank line, the
        // line at that position gets moved down, including its gutter markers and line widgets. This is
        // undesirable when injecting content at any place that is not the first line.
        //
        // Because of the way CodeMirror deals with the references to lines and how it injects content, it is
        // necessary for us to define some offsets so that content gets injected at the right place and we
        // retain our gutter markers and line widgets.
        //
        // When content is injected at:
        //
        // - First Line:
        //   - Insertion point: Line 0, Char 0
        //   - A newline will be appended to the injected content
        //   - This is the only time when wholeLineUpdateBefore should be `true`
        //
        // - Middle Line:
        //   - Insertion point: Line n - 1, Char (Line n - 1).length
        //   - A newline will be prepended to the injected content.
        //
        // - Last Line:
        //   - Insertion point: Line (lastLine), Char (lastLine).length
        //   - A newline will be prepended to the injected content.
        //

        var prefix  = '';
        var postfix = '';
        var charPos = 0;

        // We don't want to insert content after the first line if we're injecting the pre-first-line hunk
        unifiedDiffView._editor.options.wholeLineUpdateBefore = isChangeAtFirstLine;

        // Normally we want to prefix lines with a newline, however if a change is being injected
        // on the firstline we want to postfix with a newline because we'll be injecting content at the
        // start of the first line rather than at the end of the line before it.
        // @see addSeparators
        if (isChangeAtFirstLine) {
            postfix = '\n';
        } else {
            prefix = '\n';
            // Find the character position of the line we'll be inserting on.
            // When we're inserting at the last line it will be the line that was clicked on, if it
            // was a line in the middle, it is the length of the previous line.
            charPos = unifiedDiffView._editor.getLine(isChangeAtLastLine ? at : at + insertionOffset).length;
        }

        // We use replaceRange, with only the "from" object it is effectively an insert method.
        unifiedDiffView._editor.getDoc().replaceRange(prefix + text + postfix, { line: at + insertionOffset, ch: charPos});

        // we send back the "real" at, AKA the index of the first line we've added.
        // For the last line, this is the index after the line they clicked (inserted after).
        // For other lines, this is the index _at_ the line they clicked (because we inserted before that line)
        return isChangeAtLastLine ? at + 1 : at;
    }

    /**
     * Manage Unified Diff View and its base functionality.
     *
     * @param {Object} data
     * @param {Object} options
     * @constructor
     */
    function UnifiedDiffView(data, options) {
        DiffView.apply(this, arguments);
    }
    _.extend(UnifiedDiffView.prototype, DiffView.prototype);

    /**
     * Initialize the Unified Diff
     */
    UnifiedDiffView.prototype.init = function() {
        this.$container.addClass('unified-diff');

        // Trigger deprecated dataLoaded event:
        // Note that the old event passed the {DiffView} as the context, since we don't have access to that here,
        // we'll set the context to `null`. This means that this is unfortunately a breaking change.
        // Previously this event would be triggered by the {PagedScrollable} and would pass in a
        // start and a limit, we're just passing in a start of 0 and a limit as the # of lines;
        // since CodeMirror takes care of the "paging" part for us.
        deprecate.triggerDeprecated('stash.feature.diffview.dataLoaded', null, 0, 10000, this.data,
                                    'stash.feature.fileContent.diffViewDataLoaded', '2.10', '3.0');

        this.on('change', _.partial(addSeparators,  this));
        diffViewContext.attachExpandContext(this.$container, this.options.fileChange, _.bind(this._expandContextLines, this));

        this.$container.append(stash.feature.fileContent.unifiedDiffView.layout());

        this._editor = this._createEditor({
            gutters : _.filter([this.options.commentContext && this.options.commentContext.getGutterId(), 'line-number-from', 'line-number-to'], _.identity)
        }, this.$container.children('.diff-editor'));

        DiffView.prototype.init.call(this);

        // Deferred to file-content-spinner is removed before any heights are calculated.
        _.defer(_.bind(this._attachScrollBehavior, this));
    };

    /**
     * Prepare the diff view for GC. It's unusable after this.
     */
    UnifiedDiffView.prototype.destroy = function() {

        if (this._boundEvents) {
            this._boundEvents.destroy();
            this._boundEvents = null;
        }
        comments.unbindContext(this.$container);
        this._editor = null;

        DiffView.prototype.destroy.call(this);
    };

    /**
     * Set gutter element for the specified gutter at the specified line.
     *
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {string} gutterId - ID of the gutter for which to set a marker
     * @param {HTMLElement} el - element to set the gutter to.
     * @returns {StashLineHandle}
     */
    UnifiedDiffView.prototype.setGutterMarker = function (lineHandle, gutterId, el) {
        this._editor.setGutterMarker(lineHandle._handle, gutterId, el);
        return lineHandle;
    };

    /**
     * Add a CSS class to a specified line
     *
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {string} whichEl - 'wrap', 'background', or 'text' to specify which element to place the class on
     * @param {string} className - the class to add.
     * @returns {StashLineHandle}
     */
    UnifiedDiffView.prototype.addLineClass = function (lineHandle, whichEl, className) {
        this._editor.addLineClass(lineHandle._handle, whichEl, className);
        return lineHandle;
    };

    /**
     * Remove a CSS class from a specified line
     *
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {string} whichEl - 'wrap', 'background', or 'text' to specify which element to remove the class from
     * @param {string} className - the class to remove.
     * @returns {StashLineHandle}
     */
    UnifiedDiffView.prototype.removeLineClass = function (lineHandle, whichEl, className) {
        this._editor.removeLineClass(lineHandle._handle, whichEl, className);
        return lineHandle;
    };

    /**
     * Return the text on the line with the given line handle.
     *
     * @param {StashLineHandle} lineHandle as returned from {@link getLineHandle}
     * @returns {string}
     */
    UnifiedDiffView.prototype.getLine = function (lineHandle) {
        return lineHandle._handle.text;
    };

    UnifiedDiffView.prototype.operation = function(fn) {
        return this._editor.operation(fn);
    };

    UnifiedDiffView.prototype.refresh = function() {
        this._editor.refresh();
        this.trigger('resize');
    };

    /**
     * @see {@link DiffView:_acceptModification}
     * @private
     */
    UnifiedDiffView.prototype._acceptModification = function(diff, lines, changeType, at) {
        var self = this;
        at = at || 0;

        switch (changeType) {
            case 'INITIAL':
                this._editor.setValue(DiffView._combineTexts(lines));
                break;
            case 'INSERT':
                // HACK: there is dirtiness in how we represent 'at'
                // Some places need to know about the line index that was clicked (original at)
                // Others need to know the first line index that as added. (return from insertContext)
                at = insertContext(this, DiffView._combineTexts(lines), at);
                break;
            default:
                throw new Error('Unrecognized change type: ' + changeType);
        }

        _.each(lines, function(lineInfo, i) {
            var handle = new StashLineHandle(undefined, lineInfo.line.lineType, lineInfo.line.lineNumber, self._editor.getLineHandle(i + at ));
            if (lineInfo.line.lineType !== diffViewSegmentTypes.ADDED) {
                lineInfo._setHandle(DiffFileTypes.FROM, handle);
            }
            if (lineInfo.line.lineType !== diffViewSegmentTypes.REMOVED) {
                lineInfo._setHandle(DiffFileTypes.TO, handle);
            }
        });
    };

    UnifiedDiffView.prototype._attachScrollBehavior = function() {
        var self = this;
        var editor = this._editor;

        if (!editor) return; // destroyed before we started

        var programmaticScroll = false;
        var $editorContainer = this.$container.children('.diff-editor');
        this._requestWindowScrolls({
            scrollSizing : function() {
                return editor.getScrollInfo();
            },
            scroll : function(x, y) {
                programmaticScroll = true;
                editor.scrollTo(null, y);
            },
            resize : function(width, height) {
                $editorContainer.height(height);
                self.refresh();
            },
            onSizeChange : function(fn) {
                self.on('resize', fn);
            },
            onInternalScroll : function(fn) {
                editor.on('scroll', function() {
                    if (programmaticScroll) {
                        programmaticScroll = false;
                        return;
                    }
                    var scrollInfo = editor.getScrollInfo();
                    fn(scrollInfo.left, scrollInfo.top);
                });
            }
        });
    };

    /**
     * @see {@link DiffView:_editorForHandle}
     * @private
     */
    UnifiedDiffView.prototype._editorForHandle = function() {
        return this._editor;
    };

    /**
     * Expand the context between two hunks. This callback will look at the hunks and inject the new lines in
     * to the CodeMirror editor and trigger change events.
     *
     * @private
     * @param {FileChange} fileChange
     * @param {jQuery} $context
     * @param {Array.Object} hunks
     */
    UnifiedDiffView.prototype._expandContextLines = function(fileChange, $context, hunks) {
        if (!this._editor) { // destroyed
            return;
        }

        var handle = this.getLineHandle($context);
        var editorLine = this._editor.getLineNumber(handle._handle);

        this.removeLineClass(handle, 'wrap', 'first-line-of-hunk');

        _.forEach(hunks, function(hunk, i) {
            hunk.sourceSpan = hunk.destinationSpan = hunk.segments[0].lines.length;
            addContextLineNumbers(hunk);
        });

        if (hunks.length && hunks[0].segments.length && hunks[0].segments[0].lines.length) {
            this._modifyDiff({ hunks: hunks }, 'INSERT', editorLine);
        }

        // Remove the widget responsible for this expansion
        removeSeparatorWidget($context.data('widget'));

        // Trigger deprecated expanded event:
        // N.B. The old event sets the jQuery object as the context.
        deprecate.triggerDeprecated('stash.feature.diff-view.expanded', $context, {}, 'stash.feature.fileContent.diffViewExpanded', '2.10', '3.0');

        events.trigger('stash.feature.fileContent.diffViewExpanded', null, {
            $context: $context,
            hunk: hunks,
            at: editorLine
        });
    };

    return UnifiedDiffView;
});
