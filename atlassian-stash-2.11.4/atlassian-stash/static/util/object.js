define('util/object', [
    'exports'
], function(
    exports
) {
    function identity(a) { return a; }
    var has = Object.prototype.hasOwnProperty;

    /**
     * Calls Object.freeze in browsers that support freezing
     *
     * @function
     */
    exports.freeze = Object.freeze || identity;

    /**
     * Recursively calls Object.freeze in browsers that support freezing
     *
     * @function
     * @param {*} o - the object to recursively freeze
     * @param {boolean} [refreezeFrozen=false] - When true, will recurse through the properties of any objects that are
     *                                           already frozen. When false, will stop at the frozen object. The former
     *                                           may hit a stack overflow if there are circular references, and the latter
     *                                           may leave sub-objects unfrozen.
     */
    exports.deepFreeze = !Object.freeze ? identity : function deepFreeze(o, refreezeFrozen) {
        if (o !== null && typeof o === 'object') {
            var isFrozen = Object.isFrozen(o);
            if (!isFrozen) {
                Object.freeze(o);
            }
            if (!isFrozen || refreezeFrozen) {
                for (var k in o) {
                    if (has.call(o, k)) {
                        deepFreeze(o[k]);
                    }
                }
            }
        }
        return o;
    };
});