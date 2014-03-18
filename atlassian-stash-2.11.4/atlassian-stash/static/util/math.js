define('util/math', [
    'underscore',
    'exports'
],
/**
 * Math utils
 *
 * @exports util/math
 */
function(
    _,
    exports
) {

    'use strict';

    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    function multiply(a, b) {
        return a * b;
    }

    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    function add(a, b) {
        return a + b;
    }

    /**
     * Normalise a number to no higher than the `cutoff`
     * @param {number} cutoff
     *
     * @example
     * [-2, -1, 0, 1, 2].map(math.lowPass(0)) // => [-2, -1, 0, 0, 0]
     *
     * @returns {Function}
     */
    function lowPass(cutoff) {
        return function(a){
            return Math.min(cutoff, a);
        };
    }

    /**
     * Normalise a number to no lower than the `cutoff`
     * @param {number} cutoff
     *
     * @example
     * [-2, -1, 0, 1, 2].map(math.highPass(0)) // => [0, 0, 0, 1, 2]
     *
     * @returns {Function}
     */
    function highPass(cutoff) {
        return function(a){
            return Math.max(cutoff, a);
        };
    }


    /**
     * Normalise a number to no lower than the `min` and no higher than `max`
     * @param {number} min
     * @param {number} max
     *
     * @example
     * [-2, -1, 0, 1, 2].map(math.clamp(-1, 1)) //=> [-1, -1, 0, 1, 1]
     *
     * @returns {Function}
     */
    function clamp(min, max) {
        return _.compose(highPass(min), lowPass(max));
    }


    exports.add = add;
    exports.clamp = clamp;
    exports.highPass = highPass;
    exports.lowPass = lowPass;
    exports.multiply = multiply;
});
