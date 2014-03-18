define('feature/file-content/diff-view/diff-view-segment-types', [
    'util/deprecation',
    'feature/file-content/diff-view-segment-types'
], function(deprecate, segmentTypes) {

	deprecate.getMessageLogger(
		'feature/file-content/diff-view/diff-view-segment-types',
        'feature/file-content/diff-view-segment-types', '2.11', '3.0')();

	return segmentTypes;
});

define('feature/file-content/diff-view-segment-types', [], function () {

    "use strict";
    
    return {
        ADDED : 'ADDED',
        REMOVED : 'REMOVED',
        CONTEXT : 'CONTEXT'
    };
});
