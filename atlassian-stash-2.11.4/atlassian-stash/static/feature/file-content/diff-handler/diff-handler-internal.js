define('feature/file-content/diff-handler/diff-handler-internal', [
    'underscore',
    'feature/file-content/diff-view-segment-types',
    'exports'
], function (
    _,
    SegmentTypes,
    exports
) {

    "use strict";

    /**
     * Checks that all of the segments contain only added <i>or</i> only removed lines.
     *
     * @param {{hunks: [{segments: [{type: string}]}]}} data - diff data containing hunks/segments for a single file
     * @returns {boolean} return true if all the segments are only added or only removed, otherwise false
     */
    exports.isAddedOrRemoved = function(diff) {
        function isAll(type) {
            return _.all(diff.hunks, function(hunk) {
                return _.all(hunk.segments, function(segment) {
                    return segment.type === type;
                });
            });
        }
        return isAll(SegmentTypes.ADDED) || isAll(SegmentTypes.REMOVED);
    };
});
