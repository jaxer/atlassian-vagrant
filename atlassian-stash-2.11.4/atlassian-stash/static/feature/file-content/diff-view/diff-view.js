// WARNING: This module id replaces a removed older version of DiffView.
// It is a completely different module since 2.11.
// Plugin developers should not have been depending on the old one
// and should not depend on this one either.
define('feature/file-content/diff-view', [
    'bacon',
    'codemirror',
    'jquery',
    'underscore',
    'model/file-change',
    'util/bacon',
    'util/events',
    'util/function',
    'util/object',
    'util/performance',
    'util/scroll',
    'util/region-scroll-forwarder',
    'util/request-page-scrolling',
    'feature/file-content/diff-view-segment-types',
    'feature/file-content/ediff/ediff-markers'
],
/**
 * Implement the Unified Diff view for diffs.
 *
 * We use CodeMirror for rendering our code.
 *
 * @exports feature/file-content/unified-diff-view
 */
function(
    Bacon,
    CodeMirror,
    $,
    _,
    FileChange,
    baconUtil,
    events,
    fn,
    obj,
    performance,
    scrollUtil,
    RegionScrollForwarder,
    requestPageScrolling,
    diffViewSegmentTypes,
    ediffMarkers
) {
    'use strict';

    var ADDED = diffViewSegmentTypes.ADDED;
    var REMOVED = diffViewSegmentTypes.REMOVED;
    var CONTEXT = diffViewSegmentTypes.CONTEXT;

    /**
     * @typedef {object} Line
     * @property {number} destination - destination line number
     * @property {number} source - source line number
     * @property {string} lineType - CONTEXT, ADDED, REMOVED
     * @property {number} lineNumber - line number appropriate to the given line type
     * @property {string} line - The content of this line
     * @property {boolean} truncated - was this line truncated?
     */

    /**
     * Information about a line being displayed.
     *
     * @param {Line} line - the line itself
     * @param {Object} segment - the segment containing this line (matches REST output)
     * @param {Object} hunk - the hunk containing this line (matches REST output)
     * @param {Object} diff - the diff containing this line (matches REST output)
     * @param {Object} attributes - additional attributes related to this line.
     *
     * @property {Line} line - the line itself
     * @property {Object} segment - the segment containing this line (matches REST output)
     * @property {Object} hunk - the hunk containing this line (matches REST output)
     * @property {Object} diff - the diff containing this line (matches REST output)
     * @property {Object} attributes - additional attributes related to this line.
     * @property {{FROM : StashLineHandle, TO : StashLineHandle}} handles - a map of file type to line handle.
     *
     * @constructor
     */
    function LineInfo(line, segment, hunk, diff, attributes) {
        this.line = line;
        this.segment = segment;
        this.hunk = hunk;
        this.diff = diff;
        this.handles = { FROM : null, TO : null };
        this.attributes = attributes;
    }
    LineInfo.prototype._setHandle = function (fileType, handle) {
        this.handles[fileType] = handle;
    };

    /**
     * A public change object will contain some, but not all of the properties from a {@link ContentChange}
     *
     * @typedef {Object} PublicChange
     * @property {string} type - 'INITIAL' for the initial load, and 'INSERT' for expanded contexts. Other values may be added in the future for other types of change.
     * @property {Object} diff
     */

    // The property in a line that holds the line number we need, for each segment type. (e.g. ADDED segments care about the destination line number).
    var numPropForType = {
        'ADDED'   : 'destination',
        'REMOVED' : 'source',
        'CONTEXT' : 'source'
    };

    /**
     * Find the range of lines in a segment that are the "expanded" context.
     * i.e. the context lines that are not relevantContextLines
     *
     * @param {Array}  segments - array of segments to compare the
     * @param {Object} seg
     * @param {number} currentIndex
     * @param {number} relevantContextLines
     *
     * @returns {?{start: number, end: number}} the range of expanded context
     */
    function getExpandedRangeForSegment(segments, seg, currentIndex, relevantContextLines) {
        // If the current segment is a CONTEXT line, then we check the previous/next segment for being ADDED or REMOVED
        // Then we'll return an object indicating the range of lines that are "expanded" for this segment

        var prevSeg = segments[currentIndex - 1];
        var nextSeg = segments[currentIndex + 1];

        if (seg.type !== diffViewSegmentTypes.CONTEXT) {
            return null;
        }

        var start = 0;
        var end = seg.lines.length;

        // If the previous segment was an added/removed segment, set the start point
        if (prevSeg && (prevSeg.type === diffViewSegmentTypes.ADDED || prevSeg.type === diffViewSegmentTypes.REMOVED)) {
            start = relevantContextLines;
        }

        // If the next segment was an added/removed segment, set the end point
        if (nextSeg && (nextSeg.type === diffViewSegmentTypes.ADDED || nextSeg.type === diffViewSegmentTypes.REMOVED)) {
            end = end - relevantContextLines;
        }

        // don't return a range if there is overlap between the start and end points, this means that
        // all the context for this segment is relevant and should not be marked as "expanded"
        if (end > start) {
            // N.B. -1 to make it reference the array index
            return { start: start - 1, end: end };
        }

        return null;

    }

    /**
     * Turn a diff object in to an array of line objects.
     *
     * @param {Object} diff
     * @returns {Array.LineInfo} line info array
     */
    function asLineInfos(diff, options) {
        return _.chain(diff.hunks)
            // Create an array of segments objects that contain the hunk and the segment
            .map(function(hunk) {
                return _.map(hunk.segments, function(segment, index) {
                    var expandedRange = getExpandedRangeForSegment(hunk.segments, segment, index, options.relevantContextLines);
                    return { hunk : hunk, segment : segment, expandedRange: expandedRange };
                });
            })
            .flatten()
            .map(function(hunkAndSegment) {
                var seg = hunkAndSegment.segment;
                return _.map(seg.lines, function(line, index) {

                    // Add some helper properties for add-ons to use.
                    line.lineType  = seg.type;
                    line.lineNumber = line[numPropForType[seg.type]];
                    // If this line is within the expanded range, make it as such.
                    var attributes = {
                        expanded: hunkAndSegment.expandedRange && index < hunkAndSegment.expandedRange.end && index > hunkAndSegment.expandedRange.start
                    };

                    return new LineInfo(line, seg, hunkAndSegment.hunk, diff, attributes);
                });
            })
            .flatten()
            .value();
    }


    var $lineNumber = $('<div class="line-number"></div>');
    var $lineNumberMarker = $('<div class="line-number-marker" data-file-type="" data-line-type="" data-line-number=""></div>');

    /**
     * Add line numbers to the editor's gutter
     *
     * @param {DiffView} diffView
     * @param {ContentChange} change
     */
    function addLineNumbers(diffView, change) {
        change.eachLine(function(data) {
            var line = data.line;
            var FROM = data.handles.FROM;
            var TO = data.handles.TO;

            var $fromClone = $lineNumber.clone();
            var $toClone = $lineNumber.clone();
            $fromClone.addClass('line-number-from');
            $toClone.addClass('line-number-to');
            $fromClone.html(line.lineType !== ADDED ? line.source : '&nbsp;');
            $toClone.html(line.lineType !== REMOVED ? line.destination : '&nbsp;');

            diffView.setGutterMarker(FROM || TO, 'line-number-from', $fromClone[0]);
            diffView.setGutterMarker(TO || FROM, 'line-number-to', $toClone[0]);

            _.chain([FROM, TO])
                .compact()
                .uniq()
                .forEach(function(h) {
                    var $marker = $lineNumberMarker.clone();
                    $marker.attr('data-file-type', h.fileType);
                    $marker.attr('data-line-type', line.lineType);
                    $marker.attr('data-line-number', line.lineNumber);
                    $marker.html(h.lineType === ADDED ? '+' : h.lineType === REMOVED ? '-' : '&nbsp;');
                    diffView.setGutterMarker(h, 'line-number-marker', $marker[0]);
                });
        }).done(function() {
            // fire the change event only once the lines are loaded.
            // This is necessary because we can't reliably address lines until the markers are rendered.
            var publicChange = getPublicChange(change);
            triggerPublicChange(publicChange);
            if (change.type === 'INITIAL') {
                triggerPublicLoad(publicChange);
            }
        });
    }


    var classes = {};
    classes[ADDED] = 'added';
    classes[REMOVED] = 'removed';
    classes[CONTEXT] = 'context';

    /**
     * Get CSS classes to apply to a line
     * @param {string} lineType - DiffViewSegmentType
     * @param {string} conflictMarker
     * @param {boolean} isInsert - non-standard line
     * @param {boolean} isExpanded - expanded context (e.g. non-relevant context in side-by-side)
     * @returns {string}
     */
    function getLineClasses(lineType, conflictMarker, isInsert, isExpanded) {
        var cssClass = 'line ' + classes[lineType];

        if (lineType !== CONTEXT) {
            cssClass += ' modified';
        }
        if (isExpanded === true || isInsert === true) {
            cssClass += ' expanded';
        }
        cssClass += (conflictMarker ? ' conflict-' + conflictMarker.toLowerCase() : '');
        // Also add a 'new' class when we're expanding context
        cssClass += isInsert ? ' new' : '';
        return cssClass;
    }

    /**
     * Add the Diff classes to the editor based on the given diff information
     *
     * @param {DiffView} diffView
     * @param {ContentChange} change
     */
    function addDiffClasses(diffView, change) {
        var isInsert = change.type === 'INSERT';

        var affectedLines = [];
        change.eachLine(function(lineData) {
            var classes = getLineClasses(lineData.line.lineType, lineData.line.conflictMarker, isInsert, lineData.attributes.expanded);
            var FROM = lineData.handles.FROM;
            var TO = lineData.handles.TO;

            if (FROM) {
                diffView.addLineClass(FROM, 'wrap', classes);
                if (isInsert) {
                    affectedLines.push(FROM);
                }
            }
            if (TO && TO !== FROM) {
                diffView.addLineClass(TO, 'wrap', classes);
                if (isInsert) {
                    affectedLines.push(TO);
                }
            }

        }).done(function() {
            // We've been hanging on to the line handles so we can use them to remove the new class after a timeout.
            if (affectedLines.length) {
                removeNewClass(diffView, affectedLines);
            }
        });
    }

    /**
     * Remove the 'new' class from freshly inserted lines
     *
     * @param {DiffView} diffView
     * @param {Array.LineHandle} lines - an array of CodeMirror Line Handles
     */
    function removeNewClass(diffView, lines) {
        setTimeout(function() {
            if (!diffView._editor) { // we were destroyed in the meantime
                return;
            }
            diffView.operation(function() {
                _.each(lines, function(line, index){
                    diffView.removeLineClass(line, 'wrap', 'new');
                });
            });
        }, 1500);
    }

    /**
     * Add a class to the container signifying that the diff view is ready for programmatic access.
     * Used by func tests.
     * @param diffView
     */
    function addApiReadyClass(diffView) {
        diffView.$container.addClass('diff-api-ready');
    }

    /**
     * Get a public change object for editor change/load events
     *
     * @param {ChangeObject} change
     * @returns {PublicChange}
     */
    function getPublicChange(change) {
        var clone = $.extend({}, change);
        delete clone.pullRequest;
        delete clone.fileChange;
        return obj.freeze(clone);
    }

    /**
     * Trigger a public change event
     *
     * @param {PublicChange} change
     */
    function triggerPublicChange(change) {
        _.defer(_.bind(events.trigger, events, 'stash.feature.fileContent.diffViewContentChanged', null, change));
    }

    /**
     * Trigger a public load event
     *
     * @param {PublicChange} change
     */
    function triggerPublicLoad(change) {
        _.defer(_.bind(events.trigger, events, 'stash.feature.fileContent.diffViewContentLoaded', null, change));
    }

    /**
     * Create the CodeMirror instance for the given source container.
     *
     * @param {HTMLElement} containerEl
     * @param {Object} [options]
     * @returns {CodeMirror}
     */
    function createEditor(containerEl, options) {
        var editor = new CodeMirror(containerEl, $.extend({
            mode: 'text/plain',
            readOnly: true,
            lineNumbers: false, // we do this ourselves
            wholeLineUpdateBefore: false,
            cursorBlinkRate: 0,
            styleSelectedText: true
        }, options));
        blurEditorOnArrowKeys(editor);
        allowEditorKeysPassThrough(editor);
        clearSelectionOnEditorBlur(editor);
        return editor;
    }

    /**
     * Set up an event handler to handle keydown events on the editor that can then be passed through to the
     * document for regular handling. Our events don't fire because the CodeMirror events take place
     * in a textarea and the Stash keyboard shortcut handler ignores these events.
     *
     * @param {CodeMirror} editor
     */
    function allowEditorKeysPassThrough(editor) {
        editor.on('keydown', keyPassThroughHandler);
        editor.on('keypress', keyPassThroughHandler);
    }

    // Set up the keys that CodeMirror should ignore for us in ReadOnly mode.
    var disAllowedKeys = {};

    _.forEach([
        AJS.keyCode.TAB
    ], function(key) {
        disAllowedKeys[key] = true;
    });

    /**
     * Filters the key code on the event to see if it is in the disAllowed keys list.
     * @param {Event} e
     * @returns {boolean}
     */
    function disAllowedEditorKeys(e){
        var key = e.which || e.keyCode;
        return disAllowedKeys[key];
    }

    /**
     * Handle the editor keydown/keypress event and pass it through to the document
     * @param {CodeMirror} editor
     * @param {Event} e
     */
    function keyPassThroughHandler(editor, e) {

        var attributesToCopy = ['which', 'keyCode', 'shiftKey', 'ctrlKey', 'metaKey'];
        var passThroughEvent = jQuery.Event(e.type);

        _.forEach(attributesToCopy, function(attr) {
            passThroughEvent[attr] = e[attr];
        });

        //pass the event along to the document
        $(document).trigger(passThroughEvent);

        // Check if the key that was pressed is in the disAllowed list. If it is, then we will set the
        // codemirrorIgnore property on the event so that CodeMirror does not handle this key event
        // and perhaps more importantly, does not swallow the event.
        e.codemirrorIgnore = disAllowedEditorKeys(e);

    }

    /**
     * Blur the editor when an arrow key is pressed inside and it is not extending a selection.
     *
     * When CodeMirror has focus, you can use the arrow keys to navigate the diff. This is largely because we're
     * using a readonly mode for CodeMirror and there is no cursor (so it's not clear that your cursor is in fact
     * focused in the editor).
     *
     * This solution isn't bulletproof. Because we're monitoring the keydown event, we need at least 1 event to fire
     * to blur away from the textarea before the keydown event will scroll the page/diff again.
     *
     * @param {CodeMirror} editor
     */
    function blurEditorOnArrowKeys(editor) {
        var textarea = $(editor.getWrapperElement()).find('textarea')[0];

        editor.on('keydown', function(editor, e){
            // If this is an arrow key and the Shift key was NOT pressed down then we want to blur the editor.
            // 37 - 40 are keyCodes for arrow keys.
            // We also check that there isn't anything selected and that the shift key isn't pressed
            // as this would be used when creating/extending a selection.
            if (e.which >= 37 && e.which <= 40 && !e.shiftKey && !editor.somethingSelected()) {
                textarea.blur();
            }
        });
    }

    /**
     * When the editor is blurred we'll want to clear any selections that might be present.
     * @param {CodeMirror} editor
     */
    function clearSelectionOnEditorBlur(editor) {
        var isContextMenuBlur = false;

        // This is a debounced function so that the editor has a chance to fire the
        // contextmenu event which we'll want to exclude as a blurrer (so that users can right-click and copy text)
        var clearSelection = _.debounce(function() {
            var firstVisibleLine;
            if (!isContextMenuBlur) {
                firstVisibleLine = editor.lineAtHeight(editor.getScrollInfo().top + editor.heightAtLine(0));
                // We add +1 to the firstVisibleLine so CM won't scroll the diff up by a few px if we're in between lines.
                // i.e. you're scrolled between lines 12 and 13, it will unset the selection on line 14 so the diff
                // doesn't scroll by half a line
                editor.setSelection({line: firstVisibleLine + 1, ch:0});
            }
            isContextMenuBlur = false;
        }, 10);

        editor.on('contextmenu', function() {
            isContextMenuBlur = true;
        });

        editor.on('blur', function(editor) {
            if (editor.somethingSelected()) {
                clearSelection();
            }
            isContextMenuBlur = false;
        });

    }

    var apiMethods = ['getLineHandle', 'operation', 'markText', 'getLine', 'addLineClass', 'removeLineClass', 'setGutterMarker', 'addLineWidget', 'refresh'];

    /**
     * Abstract class for viewing diffs.
     *
     * @param {Object} data
     * @param {Object} options
     * @constructor
     */
    function DiffView(data, options) {
        this._data = data;
        this.options = _.extend({}, options);
        this.$container = options.$container;

        this._internalLines = {
            CONTEXT : {},
            ADDED : {},
            REMOVED : {}
        };

        this.options.fileChange = new FileChange(this.options.fileChange);

        var apiArgs = [this].concat(apiMethods);
        _.bindAll.apply(_, apiArgs);
        this._api = _.pick.apply(_, apiArgs);
    }

    /**
     * Extend {DiffView} with event mixins
     */
    _.extend(DiffView.prototype, events.createEventMixin("diffView", { localOnly : true }));

    /**
     * How content has been changed
     * @enum {string} ContentChangeType
     */
    DiffView.contentChangeType = {
        /** This is the initial load of the content. */
        INITIAL : 'INITIAL',
        /** New lines are being inserted into the content. */
        INSERT : 'INSERT'
    };

    /**
     * Initialize the DiffView
     */
    DiffView.prototype.init = function() {
        this._pr = this.options.fileChange.getCommitRange().getPullRequest();

        this.$container.addClass('diff-type-' + this.options.fileChange.getType());
        var diff = this._data;

        events.trigger('stash.feature.fileContent.diffViewDataLoaded', null, this._data);

        // Set us up some event handlers for all the things.
        this.on('change', _.partial(addLineNumbers, this));

        this._ediffMarkersHandle = ediffMarkers.init({ diffView: this });

        this._modifyDiff(diff, 'INITIAL');



        this._boundEvents = events.chain()
                .on('stash.feature.changeset.difftree.collapseAnimationFinished', this.refresh)
                .on('stash.feature.fileContent.diffViewContentLoaded', addApiReadyClass.bind(null, this));

        this.$container.addClass('fully-loaded');
    };

    /**
     * Destroy some things to help with GC
     */
    DiffView.prototype.destroy = function() {
        var self = this;
        this.trigger('destroy');
        _.forEach(['_boundEvents', '_scrollControl', '_scrollForwarder', '_ediffMarkersHandle', '_windowResize'], function(prop) {
            if (self[prop]) {
                if (typeof self[prop] === 'function') {
                    self[prop]();
                } else {
                    self[prop].destroy();
                }
                self[prop] = null;
            }
        });
        this._editor = null;
    };

    function abstractMethod() {
        throw new Error("DiffView implementation must define this.");
    }

    /**
     * Add a widget to the specified line
     *
     * @abstract
     * @function
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {HTMLElement} el - the root element of the line widget
     * @param {Object} options - any options accepted by CodeMirror's equivalent method.
     * @returns {LineWidget} the return value of CodeMirror's equivalent method.
     */
    DiffView.prototype.addLineWidget = function (lineHandle, el, options) {
        var widget = this._editorForHandle(lineHandle).addLineWidget(lineHandle._handle, el, options);
        var self = this;
        self.trigger('widgetAdded');
        return {
            clear : function() {
                widget.clear();
                self.trigger('widgetCleared');
            },
            changed : function() {
                widget.changed();
                self.trigger('widgetChanged');
            }
        };
    };

    /**
     * Set gutter element for the specified gutter at the specified line.
     *
     * @abstract
     * @function
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {string} gutterId - ID of the gutter for which to set a marker
     * @param {HTMLElement} el - element to set the gutter to.
     * @returns {StashLineHandle}
     */
    DiffView.prototype.setGutterMarker = abstractMethod;

    /**
     * Add a CSS class to a specified line
     *
     * @abstract
     * @function
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {string} whichEl - 'wrap', 'background', or 'text' to specify which element to place the class on
     * @param {string} className - the class to add.
     * @returns {StashLineHandle}
     */
    DiffView.prototype.addLineClass = abstractMethod;

    /**
     * Remove a CSS class from a specified line
     *
     * @abstract
     * @function
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @param {string} whichEl - 'wrap', 'background', or 'text' to specify which element to remove the class from
     * @param {string} className - the class to remove.
     * @returns {StashLineHandle}
     */
    DiffView.prototype.removeLineClass = abstractMethod;

    /**
     * Return the text on the line with the given line handle.
     *
     * @abstract
     * @function
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @returns {string}
     */
    DiffView.prototype.getLine = abstractMethod;

    /**
     * Return the editor for a particular handle.
     *
     * @abstract
     * @function
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @returns {CodeMirror} editor that is responsible for the given line
     * @protected
     */
    DiffView.prototype._editorForHandle = abstractMethod;

    /**
     * Mark text on lines in the editor
     *
     * @abstract
     * @function
     * @param {LineInfo} line line to mark text on
     * @param {{lineOffset: number, ch: number}} from
     * @param {{lineOffset: number, ch: number}} to
     * @param {{className: string}} options
     * @returns {CodeMirror.TextMarker}
     */
    DiffView.prototype.markText = function(line, from, to, options) {
        var lineHandle = line.handles.FROM || line.handles.TO;
        var editor = this._editorForHandle(lineHandle);
        var lineIndex = editor.getLineNumber(lineHandle._handle);
        return editor.markText(
            {line: lineIndex + from.lineOffset, ch: from.ch},
            {line: lineIndex + to.lineOffset, ch: to.ch},
            {className: options.className}
        );
    };

    /**
     * If something is done to affect the size of this diff view, refresh() can be called to force a re-rendering of it.
     *
     * @abstract
     * @function
     */
    DiffView.prototype.refresh = abstractMethod;

    /**
     * @typedef {Object} DiffLineLocator
     *
     * @property fileType
     * @property lineType
     * @property lineNumber
     */

    /**
     * Retrieve a handle for a given line identified by a DOM element element or {@link DiffLineLocator}.
     *
     * If you pass in a DOM element or jQuery object, the handle returned will be for
     * the line that element is contained within.
     *
     * If you pass in a string, we expect it to be a line type, and for the second parameter to be a line number. Together these
     * parameters identify a line in one of the files.
     *
     * @param {HTMLElement|jQuery|DiffLineLocator} locator - a DOM element inside one of the lines in this diff, or an object with locator properties
     * @returns {StashLineHandle} an object describing the line that can be used to interact with the diff.
     */
    DiffView.prototype.getLineHandle = function(locator) {

        if(locator && !locator.lineType) {
            var $lineNumbers = $(locator).closest('.line').find('.line-number-marker');
            locator = {
                fileType : $lineNumbers.attr('data-file-type'),
                lineType : $lineNumbers.attr('data-line-type'),
                lineNumber : $lineNumbers.attr('data-line-number')
            };
        }

        // This check might seem excessive, but in the event where a comment was made and the whitespace ignore option
        // changed, then the lineType may no longer be correct for this comment.
        // @TODO: Find a nicer way to solve comments + ignoreWhitespace
        var handles = locator &&
                      this._internalLines[locator.lineType][locator.lineNumber] &&
                      this._internalLines[locator.lineType][locator.lineNumber].handles;

        return handles && (handles[locator.fileType] || handles.FROM || handles.TO);
    };

    /**
     * Scroll the editor to a particular handle. Useful to scroll a line in to view when adding line widgets.
     *
     * We actually scroll the line below the targeted line in to view to ensure that the targeted
     * line is fully visible, including any widgets that may be part of the line.
     *
     * @param {StashLineHandle} handle - as returned from {@link getLineHandle}
     */
    DiffView.prototype.scrollHandleIntoView = function(handle) {
        var editor = this._editorForHandle(handle);

        // We check if the handle is the last line of the editor and ensure the entire line is
        // visible by requesting the scroll position for the bottom of the last line.
        if (editor.lastLine() === handle._handle.lineNo()) {
            editor.scrollTo(null, editor.heightAtLine(editor.lastLine()+1));
            return;
        }

        editor.scrollIntoView(handle._handle.lineNo()+1);
    };

    /**
     * Returns a public API for interacting with this diff view.
     *
     * @returns {DiffViewApi}
     */
    DiffView.prototype.api = function() {
        return this._api;
    };

    /**
     * Will be called when a request to modify the diff is received (e.g. during init() or when context is expanded).
     *
     * MUST inject/remove text in CodeMirror editor(s). Can assume you're being called within an operation().
     * MUST make successive calls to {@link LineInfo:_setHandle} for each new line. CONTEXT lines should call _setHandle twice, once for each fileType ('FROM' or 'TO')
     *
     * @abstract
     * @function
     * @param {Object} diff
     * @param {Object[]} lines
     * @protected
     */
    DiffView.prototype._acceptModification = abstractMethod;

    /**
     * Request scrolling from the page level be forwarded down to the diff view.
     * Scrolling of the file comments will be handled here. The subclass must handle any
     * forwarded scrolling through the editorScrolling object.
     * @param {{ onInternalScroll : function, resize : function, scroll : function, scrollSizing : function}} editorScrolling - an interface for accepting scroll events and propagating them within CodeMirror.
     * @private
     */
    DiffView.prototype._requestWindowScrolls = function(editorScrolling) {
        var self = this;
        return requestPageScrolling().done(function (scrollControl) {
            var scrollBus = new Bacon.Bus();

            var $container = self.$container.addClass('full-window-scrolling');
            var $fileContent = $container.closest('.file-content');
            var $fileContentHeader = $container.siblings('.file-toolbar');

            // We get the height of all siblings before our CodeMirror containers.
            // We do this because those siblings will need to be translated up with a fake scroll, before we start sending
            // scroll events to CodeMirror itself.
            var $codeMirrorPrevSiblings = $container.children('.diff-editor').first().prevAll();
            function previousSiblingsHeight() {
                return _.reduce($codeMirrorPrevSiblings, function(height, el) {
                    return el ?
                           height + ($(el).outerHeight() || 0) :
                           height;
                }, 0);
            }

            // clientHeight as seen by layout - includes file header and editor height (but not file comment height)
            var clientHeight;

            // a function to translate the container to mimic scrolling when scroll events are forwarded.
            var scrollContainer = scrollUtil.fakeScroll($container[0]);

            self._windowResize = baconUtil.getWindowSizeProperty().onValue(function(size) {
                // we leave file comments and conflict messages out of the height - we'll translate it up ourselves
                // and then the editor should be full screen once we reach the bottom of it.
                clientHeight = size.height - $fileContentHeader.outerHeight();
                editorScrolling.resize(size.width, clientHeight);
            });

            self._scrollControl = scrollControl;
            // We debounce to avoid duplicate events causing double-firing. It also ensures
            // that we call forwardeeResized _after_ a 'change' event.
            var debouncedRefresh = _.debounce(function() {
                scrollControl.refresh();
            }, 10);
            self.on('widgetAdded', debouncedRefresh);
            self.on('widgetChanged', debouncedRefresh);
            self.on('widgetCleared', debouncedRefresh);
            self.on('change', debouncedRefresh);
            if (self.options.commentContext) {
                self.options.commentContext.on('fileCommentsResized', debouncedRefresh);
            }

            // forward the editor's internal scrolls up to the page
            editorScrolling.onInternalScroll(function(x, y) {
                // translate from editor coords into layout-forwardee coords.
                scrollControl.scroll(x, y != null ? y + previousSiblingsHeight() : null);
            });

            editorScrolling.onSizeChange(debouncedRefresh);

            // split any incoming scrolls from the window - scroll either the file comments or the editors.
            // first scroll the file comments, then pass it off to the SBS or unified editors.
            self._scrollForwarder = new RegionScrollForwarder(scrollBus, [{
                    id : 'file-comments-and-messages',
                    getHeight : function() {
                        return previousSiblingsHeight() || 0;
                    },
                    setScrollTop : function(y) {
                        scrollContainer(0, y);
                    }
                },
                {
                    id : 'editors',
                    getHeight : function() {
                        // the layout will only send relevant scrolls to us,
                        // so the last item can be Infinity with no consequences.
                        // In actuality, the height is editorScrollHeight - editorClientHeight
                        return Infinity;
                    },
                    setScrollTop : function(y) {
                        editorScrolling.scroll(null, y);
                    }
                }]);

            var heightsChanged;
            if (self.options.commentContext) {
                heightsChanged = self._scrollForwarder.heightsChanged.bind(self._scrollForwarder);
                self.options.commentContext.on('fileCommentsResized', heightsChanged);
            }

            scrollControl.setTarget({
                scrollSizing : function() {
                    var editorScrollInfo = editorScrolling.scrollSizing();
                    return {
                        height : editorScrollInfo.height + previousSiblingsHeight(),
                        clientHeight: editorScrollInfo.clientHeight
                    };
                },
                offset : function() {
                    return $fileContent.offset();
                },
                scroll : function(x, y) {
                    if (y != null) { // ignore horizontal changes
                        scrollBus.push({
                            top : y
                        });
                    }
                }
            });
        }).fail(function(err) {
            // No need to handle a rejected page scrolling request yet.
            // In the future, can check `err.reason` if needed.
        });
    };

    /**
     * Get all the lines from an array of internal line datas and create a newline separated string.
     *
     * @param {Array.LineInfo} lineInfos
     * @returns {string}
     * @protected
     */
    DiffView._combineTexts = function(lineInfos) {
        return _.chain(lineInfos).pluck('line').pluck('line').value().join('\n');
    };

    /**
     * Subclasses should call this to create CodeMirror editors.
     * @param options
     * @param $container jQuery element to attach the editor to
     * @returns {CodeMirror}
     * @protected
     */
    DiffView.prototype._createEditor = function(options, $container) {
        options = $.extend({
            value : '' // initialize small so we can do everything at once in the operation.
        }, options, {
            gutters : _.uniq([ 'CodeMirror-linewidget' ].concat(options.gutters || []).concat([ 'line-number-marker' ]))
        });

        var editorContainer;
        if ($container && $container.length) {
            editorContainer = $container[0];
        } else {
            editorContainer = this.$container[0];
        }
        return createEditor(editorContainer, options);
    };

    DiffView.prototype._getLineClasses = getLineClasses;

    /**
     * Begin a request for content to be added to the view.
     *
     * @param {Object} diff - diff object shaped like our REST models
     * @param {string} changeType - INITIAL or INSERT
     * @param {*} ...args - additional arguments are passed into _acceptDiff and _populateHandles
     * @protected
     */
    DiffView.prototype._modifyDiff = function(diff, changeType/*, args*/) {
        var args = [].slice.call(arguments, 2);
        var self = this;

        // don't modify our inputs
        diff = $.extend(true, {}, diff);

        var lineInfos = asLineInfos(diff, { relevantContextLines: this.options.relevantContextLines });
        _.forEach(lineInfos, function(internalLineData) {
            self._internalLines[internalLineData.line.lineType][internalLineData.line.lineNumber] = internalLineData;
        });

        function editorOperation() {
            this._acceptModification.apply(this, [diff, lineInfos, changeType].concat(args));
            // acceptModification populates the handles on each lineInfo.
            // So now that that's done, we can freeze everything safely.
            // The CodeMirror line handle has access to DOM elements which we don't really want to freeze, and doing
            // so causes errors.
            // So we only shallow freeze the handles.
            _.chain(lineInfos).pluck('handles').values().flatten().each(obj.freeze);
            obj.deepFreeze(lineInfos, !'refreezeFrozen');

            /**
             * A content-changed event will be triggered when content in the editor is updated/changed
             * The following object will be passed along:
             *
             * @typedef {Object} ContentChange
             * @property {ContentChangeType} type
             * @property {Object} diff matches REST diff object
             * @property {PullRequest} [pullrequest] the pull request associated to this diff, if any.
             * @property {FileChange} fileChange a file change object describing the change at a file level.
             * @property {function(function(LineInfo))} eachLine executes a function for each line in the change, passing through a {@link LineInfo}
             */
            var change = obj.freeze({
                type : changeType,
                diff: diff,
                linesAdded : lineInfos.length,
                pullRequest: this._pr,
                fileChange: this.options.fileChange,
                //diffView : this.api(),
                eachLine : function(fn) {
                    var map = performance.frameBatchedMap(fn, {
                        min : 500,
                        initial : 200 // just enough to render the first screen.
                    }, self.operation.bind(self));

                    var deferred = map(lineInfos);
                    self.on('destroy', deferred.reject.bind(deferred));
                    return deferred.promise();
                }
            });

            // hack so classes are added synchronously.
            // We need classes on our elements upfront because they affect sizing of the lines and can get things out of
            // whack if they aren't immediately present.
            // They are also much faster to add than the line numbers are.
            addDiffClasses(this, {
                type : changeType,
                eachLine : function(fn) {
                    _.forEach(lineInfos, fn);
                    return $.Deferred().resolve();
                }
            });

            this.trigger('change', change);

            if (changeType === 'INITIAL') {
                this.trigger('load', change);
            }
        }

        this.operation(_.bind(editorOperation, this));
    };

    return DiffView;
});
