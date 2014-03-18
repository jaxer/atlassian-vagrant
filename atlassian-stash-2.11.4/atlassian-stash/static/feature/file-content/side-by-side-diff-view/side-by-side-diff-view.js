define('feature/file-content/side-by-side-diff-view', [
    'jquery',
    'underscore',
    'util/function',
    'util/performance',
    'util/svg',
    'feature/comments',
    'feature/file-content/diff-view',
    'feature/file-content/diff-view-segment-types',
    'feature/file-content/determine-language',
    'feature/file-content/line-handle',
    'feature/file-content/side-by-side-diff-view/synchronized-scroll',
    'feature/file-content/diff-view-file-types'
],
/**
 * Implement the Side-by-side Diff view for diffs.
 *
 * We use CodeMirror for rendering our code.
 *
 * @exports feature/file-content/side-by-side-diff-view
 */
function(
    $,
    _,
    fn,
    performance,
    svg,
    comments,
    DiffView,
    diffViewSegmentTypes,
    determineLanguage,
    StashLineHandle,
    sbsSynchronizedScroll,
    DiffFileTypes
) {
    'use strict';

    /**
     * Manage Side-by-side Diff View and its base functionality.
     *
     * @param {Object} data - diff JSON
     * @param {Object} options - file options
     * @constructor
     */
    function SideBySideDiffView(data, options) {
        DiffView.apply(this, arguments);
    }
    _.extend(SideBySideDiffView.prototype, DiffView.prototype);

    /**
     * Initialize the Side-by-side Diff
     */
    SideBySideDiffView.prototype.init = function() {
        this.$container.addClass('side-by-side-diff');

        var filePath = this.options.fileChange.getPath().toString();
        var firstLine = this._data.hunks[0].segments[0].lines[0].line;
        var mode = determineLanguage.fromFileInfo({
            firstLine: firstLine,
            path: filePath,
            legacy: false
        });

        this.$container.append(stash.feature.fileContent.sideBySideDiffView.layout());

        this._fromEditor = this._createEditor({
            gutters : _.filter([this.options.commentContext && this.options.commentContext.getGutterId(), 'line-number-from'], _.identity)
        }, this.$container.find('.side-by-side-diff-editor-from'));

        this._toEditor = this._createEditor({
            gutters : _.filter([this.options.commentContext && this.options.commentContext.getGutterId(), 'line-number-to'], _.identity)
        }, this.$container.find('.side-by-side-diff-editor-to'));

        DiffView.prototype.init.call(this);

        /*if (mode !== "text/plain") {
            WRM.require('wr!com.atlassian.stash.stash-highlight-plugin:' + mode).done(_.bind(this.setEditorMode, this, mode));
        }*/
    };

    /**
     * Sets the CodeMirror mode of the Side By Side Diff View
     *
     * @param mode
     */
    SideBySideDiffView.prototype.setEditorMode = function(mode) {
        if (this._fromEditor && this._toEditor) { // ensure the SBS object was not destroyed.
            this._fromEditor.setOption('mode', mode);
            this._toEditor.setOption('mode', mode);
        }
    };

    /**
     * Prepare the diff view for GC. It's unusable after this.
     */
    SideBySideDiffView.prototype.destroy = function() {
        if (this._detachScrollingBehavior) {
            this._detachScrollingBehavior();
            this._detachScrollingBehavior = null;
        }
        comments.unbindContext(this.$container);

        DiffView.prototype.destroy.call(this);

        this._fromEditor = null;
        this._toEditor = null;
    };

    /**
     * Set gutter element for the specified gutter at the specified line.
     *
     * @param {StashLineHandle} lineHandle - line handle as returned from {@link getLineHandle}
     * @param {string} gutterId - ID of the gutter for which to set a marker
     * @param {HTMLElement} el - element to set the gutter to.
     * @returns {StashLineHandle}
     */
    SideBySideDiffView.prototype.setGutterMarker = function (lineHandle, gutterId, el) {
        this._editorForHandle(lineHandle).setGutterMarker(lineHandle._handle, gutterId, el);
        return lineHandle;
    };

    /**
     * Add a CSS class to a specified line
     *
     * @param {StashLineHandle} lineHandle - line handle as returned from {@link getLineHandle}
     * @param {string} whichEl - 'wrap', 'background', or 'text' to specify which element to place the class on
     * @param {string} className - the class to add.
     * @returns {StashLineHandle}
     */
    SideBySideDiffView.prototype.addLineClass = function (lineHandle, whichEl, className) {
        this._editorForHandle(lineHandle).addLineClass(lineHandle._handle, whichEl, className);
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
    SideBySideDiffView.prototype.removeLineClass = function (lineHandle, whichEl, className) {
        this._editorForHandle(lineHandle).removeLineClass(lineHandle._handle, whichEl, className);
        return lineHandle;
    };

    /**
     * Return the text on the line with the given line handle.
     *
     * @param {StashLineHandle} lineHandle - as returned from {@link getLineHandle}
     * @returns {string}
     */
    SideBySideDiffView.prototype.getLine = function (lineHandle) {
        return lineHandle._handle.text;
    };

    SideBySideDiffView.prototype.operation = function(fn) {
        var self = this;
        // run in an operation for both editors so they both hold their updates til the end.
        return this._fromEditor.operation(function() {
            return self._toEditor.operation(fn);
        });
    };

    /**
     * Update the editors when something has changed (e.g., size of the editor).
     */
    SideBySideDiffView.prototype.refresh = function() {
        this._fromEditor.refresh();
        this._toEditor.refresh();
        this.trigger('resize');
    };

    /**
     * @see {@link DiffView:_acceptModification}
     * @private
     */
    SideBySideDiffView.prototype._acceptModification = function(diff, lineInfos, changeType) {
        if (changeType !== 'INITIAL') {
            throw new Error('Unrecognized change type: ' + changeType);
        }

        var fromLineInfos = _.filter(lineInfos, function (l) {
            return l.line.lineType !== diffViewSegmentTypes.ADDED;
        });
        var toLineInfos = _.filter(lineInfos, function (l) {
            return l.line.lineType !== diffViewSegmentTypes.REMOVED;
        });

        this._fromEditor.setValue(DiffView._combineTexts(fromLineInfos));
        this._toEditor.setValue(DiffView._combineTexts(toLineInfos));

        // must be deferred because there is a file-content spinner that affects page height and our calculations are screwed.
        _.defer(_.bind(this._attachScrollBehavior, this, lineInfos));

        function isPairedToChange(prevLineInfo, lineInfo) {
            // a context line after a context line from a different segment means there is a change in the other editor
            return prevLineInfo.segment !== lineInfo.segment &&
                   prevLineInfo.line.lineType === diffViewSegmentTypes.CONTEXT &&
                   lineInfo.line.lineType === diffViewSegmentTypes.CONTEXT;
        }

        function setupLines(lineInfos, editor, handleProp) {
            var prevLineInfo;
            _.forEach(lineInfos, function(lineInfo, i) {
                var handle = editor.getLineHandle(i);
                lineInfo._setHandle(handleProp, new StashLineHandle(handleProp, lineInfo.line.lineType, lineInfo.line.lineNumber, handle));

                if (prevLineInfo && isPairedToChange(prevLineInfo, lineInfo)) {
                    editor.addLineClass(handle, 'wrap', 'paired-with-change');
                }
                prevLineInfo = lineInfo;
            });
        }

        setupLines(fromLineInfos, this._fromEditor, DiffFileTypes.FROM);
        setupLines(toLineInfos, this._toEditor, DiffFileTypes.TO);
    };

    var editorForFileType = {};
    editorForFileType[DiffFileTypes.FROM] = '_fromEditor';
    editorForFileType[DiffFileTypes.TO] = '_toEditor';


    /**
     * @see {@link DiffView:_editorForHandle}
     * @private
     */
    SideBySideDiffView.prototype._editorForHandle = function (handle) {
        return this[editorForFileType[handle.fileType]];
    };

    /**
     * Set up a few different behaviors:
     * - Synchronized scrolling between the left and right sides
     * - Page-level scroll forwarding for a 'full-screen' mode.
     * - scrolls the editor to the first real change in the file.
     *
     * @param {LineInfo[]} lineInfos
     * @private
     */
    SideBySideDiffView.prototype._attachScrollBehavior = function (lineInfos) {
        var self = this;
        var fromEditor = this._fromEditor;
        var toEditor = this._toEditor;

        if (!fromEditor) return; // destroyed before we started

        // set up synchronized scrolling between the two sides.
        var syncScrollingInfo = sbsSynchronizedScroll.setupScrolling(this, lineInfos, fromEditor, toEditor, {
            includeCombinedScrollable : true
        });

        // Link up the combined scrollable from our sync scrolling to the window
        // - Whenever the page is scrolled, it will call our scroll() function and we need to forward that to the combined scrollable.
        // - Whenever the page is resized, it'll let us know so we can resize ourself as needed.
        // - We can also call the onSizeChange and onInternalScroll callbacks it adds whenever we need the page to update based on our
        //   scroll location or size changes.
        var $editorColumns = self.$container.children('.diff-editor, .segment-connector-column');
        this._requestWindowScrolls({
            scrollSizing : function() {
                return syncScrollingInfo.combinedScrollable.getScrollInfo();
            },
            scroll : function(x, y) {
                if (y != null) { // ignore horizontal changes
                    syncScrollingInfo.combinedScrollable._scrollToNative(null, y);
                }
            },
            resize : function(width, height) {
                // ignore width changes
                syncScrollingInfo.combinedScrollable.setClientHeight(height);
                $editorColumns.height(height);
                self.refresh();
            },
            onSizeChange : function(fn) {
                self.on('resize', fn);
            },
            onInternalScroll : function(fn) {
                var oldScrollTo = syncScrollingInfo.combinedScrollable.scrollTo;
                syncScrollingInfo.combinedScrollable.scrollTo = function(x, y) {
                    oldScrollTo.apply(this, arguments);
                    fn(null, y);
                };
            }
        }).then(function() {
            // Refresh the editor once scroll control has been surrendered to ensure all widgets update their size
            self.refresh();
        });

        // draw paths between the left and right side
        this._initSegmentLinking(syncScrollingInfo.linkedFromAndToRegions);

        // scroll to the first change in the file so they're not looking at all white.
        scrollEditorToFirstChange(syncScrollingInfo.linkedFromAndToRegions);

        this._detachScrollingBehavior = function() {
            syncScrollingInfo.destroy();
        };
    };

    /**
     * Setup the center SVG segment-linking column to handle resizing and scrolling.
     *
     * @param {CodeMirrorRegion[][]} linkedRegionsList - a list of regions from each scrollable (from, to) that are linked together.
     * @private
     */
    SideBySideDiffView.prototype._initSegmentLinking = function(linkedRegionsList) {
        var $segmentColumn = $('.segment-connector-column');
        var svgEl = svg.createElement('svg', {});
        $segmentColumn.append(svgEl);

        var updateSegmentConnectors = updateSegmentLinkingColumn.bind(null, linkedRegionsList, svgEl, this._getLineClasses);

        var resize = performance.enqueueCapped(requestAnimationFrame, function resize() {
            svgEl.setAttribute('height', $segmentColumn.height());
            svgEl.setAttribute('width', $segmentColumn.width());
            updateSegmentConnectors();
        });

        var updateSegmentConnectorsOnAnimationFrame = performance.enqueueCapped(requestAnimationFrame, updateSegmentConnectors);

        this.on('sync-scroll', updateSegmentConnectors);
        this.on('widgetAdded', updateSegmentConnectorsOnAnimationFrame);
        this.on('widgetChanged', updateSegmentConnectorsOnAnimationFrame);
        this.on('widgetCleared', updateSegmentConnectorsOnAnimationFrame);
        this.on('resize', resize);
        resize();
    };

    /**
     * Return whether a region contains modification lines.
     *
     * @param {CodeMirrorRegion} r
     * @returns {boolean}
     */
    function isModification(r) {
        return r._seg && r._seg.type !== diffViewSegmentTypes.CONTEXT && r._numLines > 0;
    }

    /**
     * Scroll an editor to the first change, based of a set of segments.
     *
     * @param {CodeMirrorRegion[][]} linkedRegionsList - a list of regions from each scrollable (from, to) that are linked together.
     */
    function scrollEditorToFirstChange(linkedRegionsList) {
        var firstChange = _.chain(linkedRegionsList).find(function(linkedRegions) {
            return _.some(linkedRegions, isModification);
        }).find(isModification).value();

        if (firstChange) {
            var almostHalfScreen = firstChange._editor.getScrollInfo().clientHeight * 0.45; // 45% from the top.
            var scrollTo =  firstChange.getOffsetTop() - almostHalfScreen;

            if (scrollTo > 0) {
                firstChange._editor.scrollTo(0, scrollTo);
            }
        }
    }

    /**
     *
     * @param {CodeMirrorRegion[][]} linkedRegionsList - a list of regions from each scrollable (from, to) that are linked together.
     * @param {Element} svgEl - <svg> element to populate
     * @param {Function} getLineClasses - a function that returns a string with the appropriate CSS classes, given some metadata about a line.
     */
    function updateSegmentLinkingColumn(linkedRegionsList, svgEl, getLineClasses) {
        var svgStyle;
        var height = svgEl.offsetHeight || parseFloat((svgStyle = window.getComputedStyle(svgEl)).height, 10);
        var width = svgEl.offsetWidth || parseFloat(svgStyle.width, 10);
        var pastWidth = width + 1;
        var curvePointLeft = width * 0.4;
        var curvePointRight = width * 0.6;


        var modifiedRegions = linkedRegionsList.filter(function(r) {
            return r.some(isModification);
        });
        var visibleRegionInfo = modifiedRegions.map(function getInfo(linkedRegions) {
            return linkedRegions.map(function(r) {
                var top = r.getOffsetTop();
                var bottom = top + r.getHeight();
                return {
                    region : r,
                    top : top + 0.5, // SVG points are centered on the middle of the pixel, so the lines are antialiased and blurry. shifting them down by 0.5 pixels realigns them back with the pixel grid and makes them sharp again
                    bottom : bottom + 0.5,
                    above : top < 0,
                    inside : bottom > 0 && top < height,
                    below : bottom > height
                };
            });
        })
        .filter(function isVisible(linkedRegionInfos) {
            return linkedRegionInfos.some(fn.dot('inside')) ||
                (linkedRegionInfos.some(fn.dot('above')) && linkedRegionInfos.some(fn.dot('below')));
        });

        function getPath(fromRegionInfo, toRegionInfo) {
            return new svg.PathBuilder()
                   .moveTo(-1, fromRegionInfo.top)
                   .curve(curvePointLeft, fromRegionInfo.top,
                          curvePointRight, toRegionInfo.top,
                          pastWidth, toRegionInfo.top)
                   .lineTo(pastWidth, toRegionInfo.bottom)
                   .curve(curvePointRight, toRegionInfo.bottom,
                          curvePointLeft, fromRegionInfo.bottom,
                          -1, fromRegionInfo.bottom)
                   .close()
                   .build();
        }

        function getClasses(fromRegionInfo, toRegionInfo) {
            var fromFirstLineInfo = fromRegionInfo.region._lineInfos[0];
            var toFirstLineInfo = toRegionInfo.region._lineInfos[0];
            var fromFirstLine = fromFirstLineInfo && fromFirstLineInfo.line || {
                conflictMarker : null,
                lineType : toFirstLineInfo.line.lineType
            };
            var toFirstLine = toFirstLineInfo && toFirstLineInfo.line || {
                conflictMarker : null,
                lineType : fromFirstLineInfo.line.lineType
            };
            var allClasses = getLineClasses(fromFirstLine.lineType, fromFirstLine.conflictMarker, false) + ' ' +
                             getLineClasses(toFirstLine.lineType, toFirstLine.conflictMarker, false);
            return _.chain(allClasses.split(/\s+/)).unique().without('line').value().join(' ');
        }

        var templateData = visibleRegionInfo.map(fn.spread(function(fromRegionInfo, toRegionInfo) {
            return {
                path : getPath(fromRegionInfo, toRegionInfo),
                extraClasses : getClasses(fromRegionInfo, toRegionInfo)
            };
        }));

        while(svgEl.hasChildNodes()) {
            svgEl.removeChild(svgEl.firstChild);
        }

        var isAddedAndRemoved = function(classes) {
            return (classes.indexOf('added') !== -1) && (classes.indexOf('removed') !== -1);
        };

        var getSvgGradient = _.once(function(gradientId){
            //Would be nice to move the offset to CSS with the `stop-color`, but it didn't like that
            var stops = [{
                'class': 'removed',
                offset: '0%'
            },
            {
                'class': 'removed',
                offset: '30%'
            },
            {
                'class': 'added',
                offset: '70%'
            },
            {
                'class': 'added',
                offset: '100%'
            }];

            stops = _.map(stops, svg.createElement.bind(svg, 'stop'));

            return _.reduce(stops, function(grad, stop){
                grad.appendChild(stop);
                return grad;
            }, svg.createElement('linearGradient', {
                'id': gradientId
            }));
        });

        var gradientId = 'added-and-removed-svg-gradient';
        var fragment = templateData.map(function(data) {
            var props = {
                'class' : 'segment-connector ' + data.extraClasses,
                d : data.path
            };

            if (isAddedAndRemoved(data.extraClasses)) {
                //This sucks, but Firefox won't let you set a svg gradient fill via CSS.
                _.extend(props, {
                    fill: 'url(#'+ gradientId + ')'
                });
            }

            return svg.createElement('path', props);
        }).concat(getSvgGradient(gradientId)) //Add the gradient definition as the last element
        .reduce(function(frag, pathEl) {
            frag.appendChild(pathEl);
            return frag;
        }, document.createDocumentFragment());

        svgEl.appendChild(fragment);
    }

    return SideBySideDiffView;
});
