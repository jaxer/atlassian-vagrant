define('model/file-content-types', [
    'deprecate'
], function (deprecate) {

    /**
     * @deprecated since 2.11. Removal in 3.0.
     * Use model/file-content-modes instead.
     * @type {object}
     */

    'use strict';

    var types = {
        SOURCE: 'source',
        DIFF: 'diff'
    };
    return deprecate.obj(types, 'model/file-content-types::', 'model/file-content-modes::', '2.11', '3.0');
});