define('feature/ediff', [
    'util/deprecation',
    'feature/file-content/ediff'
], function(deprecate, ediff) {

    deprecate.getMessageLogger(
        'feature/ediff',
        'feature/file-content/ediff', '2.10', '3.0')();

    return ediff;
});

define('feature/file-content/ediff', [
    'util/html'
],
function(
    htmlUtil
) {

    var tokenizer = /\w+|\s+|./gim,
        prefixingWhitespace = /\n[ \u00a0\t\r]+/mg, // \n followed by spaces, tabs and nbsp
        whitespace = /\s/m,
        ADD = 'add',
        DELETE = 'delete',
        CHANGE = 'change',
        NodeStream = htmlUtil.NodeStream,
        NodeType = htmlUtil.NodeType,
        OPEN_NODE = NodeType.OPEN,
        CLOSE_NODE = NodeType.CLOSE;

    function tokenizeString(s) {
        /*jshint boss:true */
        var l = [], t;
        tokenizer.lastIndex = 0; // reset the tokenizer
        while (t = tokenizer.exec(s)) {
            l.push({
                start: t.index,
                value: t[0],
                end: tokenizer.lastIndex
            });
        }
        return l;
    }

    function getTokensComparableValue(t) {
        var comparableValue = t.comparableValue,
            value;
        if (typeof comparableValue !== 'string') {
            value = comparableValue = t.value;
            whitespace.lastIndex = 0;  // reset the whitespace
            if (whitespace.test(value)) {
                if (t.start === 0) {
                    value = '\n' + value;
                }
                if (value.indexOf('\n') !== -1) {
                    comparableValue = value.replace(prefixingWhitespace, "\n");
                }
            }
            t.comparableValue = comparableValue;
        }
        return comparableValue;
    }

    /**
     * This algorithm is based on FishEye's java implementation of diff which itself is an implementation of
     * diff algorithm described in An O(ND) Difference Algorithm and its Variations by Eugene W. Myers
     * @param originalTokens the tokens for the original text
     * @param revisedTokens the tokens for the revised text
     * @return an array of hunks
     */
    function generateHunks(originalTokens, revisedTokens) {
        var l = [];

        if (originalTokens.length !== 0 || revisedTokens.length !== 0) {
            var path = buildPath(originalTokens, revisedTokens);
            if (path.snake) {
                path = path.prev;
            }
            while (path && path.prev && path.prev.j >= 0) {
                if (path.snake) {
                    throw "bad diffpath: found snake when looking for diff";
                }
                var i = path.i;
                var j = path.j;

                path = path.prev;
                var ianchor = path.i;
                var janchor = path.j;

                var iCount = i - ianchor;
                var jCount = j - janchor;

                l.unshift({
                    from : ianchor,
                    fromCount : iCount,
                    to : janchor,
                    toCount : jCount,
                    type : (iCount === 0 && ADD) || (jCount === 0 && DELETE) || CHANGE
                });

                if (path.snake) {
                    path = path.prev;
                }
            }
        }
        return l;
    }

    /**
     * creates these path objects which are used to figure out what the hunks are.
     * To be honest I don't really know how it works. Each path is made of snake nodes
     * and diff nodes.
     * BuildPath is by far the slowest component of ediff, on a test case with 2 x 5500 token segments, it takes ~4.5s.
     * getTokensComparableValue is a significant contributor (~10% of the BuildPath CPU time), though mostly through
     * the sheer number of times it is called (~30,000,000 times for the previous case).
     * Garbage Collection is also a contributing factor, consuming ~10% as much CPU time as BuildPath.
     * @param originalTokens
     * @param revisedTokens
     * @return a path
     */
    function buildPath(originalTokens, revisedTokens) {
        var N = originalTokens.length,
            M = revisedTokens.length,
            MAX = N + M + 1,
            size = 1 + 2 * MAX,
            middle = (size + 1) / 2,
            diagonal = [];
        diagonal.length = size;

        diagonal[middle + 1] = createSnakeNode(0, -1, null);
        for (var d = 0; d < MAX; d++) {
            for (var k = -d; k <= d; k += 2) {
                var kmiddle = middle + k,
                    kplus = kmiddle + 1,
                    kminus = kmiddle - 1,
                    prev,
                    i;

                if ((k === -d) ||
                    (k !== d && diagonal[kminus].i < diagonal[kplus].i)) {
                    i = diagonal[kplus].i;
                    prev = diagonal[kplus];
                } else {
                    i = diagonal[kminus].i + 1;
                    prev = diagonal[kminus];
                }

                diagonal[kminus] = null; // no longer used

                var j = i - k;

                var node = createDiffNode(i, j, prev);

                // orig and rev are zero-based
                // but the algorithm is one-based
                // that's why there's no +1 when indexing the sequences
                while (i < N && j < M && (getTokensComparableValue(originalTokens[i]) === getTokensComparableValue(revisedTokens[j]))) {
                    i++;
                    j++;
                }
                if (i > node.i) {
                    node = createSnakeNode(i, j, node);
                }

                diagonal[kmiddle] = node;

                if (i >= N && j >= M) {
                    return diagonal[kmiddle];
                }
            }
            diagonal[middle + d - 1] = null;

        }
        // According to Myers, this cannot happen
        throw "could not find a diff path";
    }

    function createSnakeNode(i, j, prev) {
        return {
            i : i,
            j : j,
            prev : prev,
            snake : true
        };
    }

    function createDiffNode(i, j, prev) {
        return {
            i : i,
            j : j,
            prev : previousSnake(prev)
        };
    }

    function previousSnake(node) {
        while (node && node.i !== 0 && node.j !== 0 && !node.snake) {
            if (!node.prev) {
                return node;
            }
            node = node.prev;
        }
        return node;
    }

    function updateRegions(tokens, regions, start, len, type) {
        for (var i = start; i < start + len; i++) {
            var lastI = regions.length - 1;
            var prev = regions.length && regions[lastI];
            var token = tokens[i];
            if (prev && prev.end === token.start) {
                regions[lastI] = {
                    start: prev.start,
                    end: token.end,
                    type: prev.type
                };
            } else {
                regions.push({
                    start: token.start,
                    end: token.end,
                    type: type
                });
            }
        }
    }

    /**
     * this loops through each of the hunks and uses original and revised tokens
     * to determine the regions of the original text which have been changed or deleted
     * and the revised text which have been changed or added
     * @param originalTokens
     * @param revisedTokens
     * @param hunks
     * @return {Object}
     */
    function generateDiff(originalTokens, revisedTokens, hunks) {
        var originalRegions = [],
            revisedRegions = [];
        for (var i = 0, l = hunks.length, hunk, hunkType; i < l; i++) {
            hunk = hunks[i];
            hunkType = hunk.type;
            if (hunkType === CHANGE || hunkType === DELETE) {
                updateRegions(originalTokens, originalRegions, hunk.from, hunk.fromCount, hunkType);
            }
            if (hunkType === CHANGE || hunkType === ADD) {
                updateRegions(revisedTokens, revisedRegions, hunk.to, hunk.toCount, hunkType);
            }
        }
        return {
            originalRegions : originalRegions,
            revisedRegions : revisedRegions
        };
    }

    /**
     *
     * @param originalTokens
     * @param revisedTokens
     * @return An object in the following form:
     * {
     *   'originalRegions' : [{start:0, end:0, type:'add'}],
     *   'revisedRegions' : [{start:0, end:0}]
     * }
     */
    function diff(originalTokens, revisedTokens) {
        var hunks = generateHunks(originalTokens, revisedTokens);
        return generateDiff(originalTokens, revisedTokens, hunks);
    }

    /**
     * A node stream of the diff regions
     * @param regions
     * @constructor
     */
    function DiffRegionNodeStream(regions) {
        this._regions = regions.slice(0);
        this._regionsLength = this._regions.length;
        this._opened = false;
        this._nextPosition = 0;
        this._current = undefined;
    }
    DiffRegionNodeStream.prototype = new NodeStream();

    DiffRegionNodeStream.prototype.hasNext = function() {
        return this._opened || this._nextPosition < this._regionsLength;
    };

    DiffRegionNodeStream.prototype.next = function() {
        if (!this.hasNext()) {
            return null;
        } else if (this._opened) {
            this._opened = false;

            return {
                type : CLOSE_NODE,
                textPosition : this._current.end,
                value : '</span>'
            };
        } else {
            this._opened = true;
            var current = this._current = this._regions[this._nextPosition];
            this._nextPosition++;

            return {
                type : OPEN_NODE,
                textPosition : current.start,
                value : '<span class="ediff-' + current.type + '">',
                close : {
                    type  : CLOSE_NODE,
                    value : '</span>'
                }
            };
        }
    };

    DiffRegionNodeStream.prototype.getNextType = function() {
        return this.hasNext() ? (this._opened ? CLOSE_NODE : OPEN_NODE) : null;
    };

    DiffRegionNodeStream.prototype.getNextTextPosition = function() {
        return this.hasNext() ? (this._opened ? this._current.end : this._regions[this._nextPosition].start) : null;
    };

    return {
        tokenizeString : tokenizeString,
        getTokensComparableValue : getTokensComparableValue,
        diff : diff,
        DiffRegionNodeStream : DiffRegionNodeStream
    };
});
