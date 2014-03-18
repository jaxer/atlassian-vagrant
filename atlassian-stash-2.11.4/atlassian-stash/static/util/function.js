define('util/function', [
    'underscore',
    'exports'
],
/**
 * Functional programming utils
 *
 * @exports util/function
 */
function(
    _,
    exports
    ) {

    'use strict';

    var slice = Array.prototype.slice;

    /**
     * Limit the number of arguments passed to a function.
     * Used to trim off extra arguments from collection methods like `map` and `forEach`
     * @param {Function} fn
     * @param {number} numArgs
     *
     * @example
     *     fn.arity(function(){return arguments}, 2)(1,2,3) // => [1, 2]
     *     
     * @returns {Function}
     */
    function arity(fn, numArgs) {
        return function(){
            return fn.apply(this, slice.call(arguments, 0, numArgs));
        };
    }

    /**
     * Returned a function that when called _always_ returns the original argument.
     * @param {*} arg
     *
     * @example
     * _.map(['a', 'b', 'c'], fn.constant('x')) // => ['x', 'x', 'x']
     *
     * @returns {Function}
     */
    function constant(arg) {
        return function() {
            return arg;
        };
    }

    /**
     * Return a function that when called with argument A, will return a default value if A is undefined or null, otherwise
     * will return A.
     * @param {*} theDefault
     *
     * @example
     * _.map(['foo', 'bar', null, 'bar'], fn.defaultValue('foo')) // => ['foo', 'bar', 'foo', 'bar']
     *
     * @returns {Function}
     */
    function defaultValue(theDefault) {
        return function(a) {
            return a != null ? a : theDefault;
        };
    }

    /**
     * Get a property from a lazy object.
     * Basically a more generic version of _.pluck.
     * @param {string} key
     *
     * @example
     * var values = [{a: 'b'}, {a: 'c'}]
     *
     * _.map(values, fn.dot('a')) //=> ['b', 'c']
     * _.map(values, _.compose(fn.eq('b'), fn.dot('a'))) // => [true, false]
     *
     * @returns {Function}
     */
    function dot(key) {
        return function(object) {
            return object[key];
        };
    }

    /**
     * Curried form of strict equals.
     * @param {*} a
     *
     * @example
     * _.map(['a', 'b', 'c'], fn.eq('a')) // => [true, false, false]
     *
     * @returns {Function}
     */
    function eq(a) {
        return function(b) {
            return a === b;
        };
    }

    /**
     * Reverses the order of the function parameters
     * @param {Function} fn
     *
     * @example
     * fn.flip(function(){return arguments})(1,2,3) //=> [3, 2, 1]
     *
     * @returns {Function}
     */
    function flip(fn) {
        return function() {
            return fn.apply(this, slice.call(arguments).reverse());
        };
    }

    /**
     * Convert result from indexOf to boolean
     * @param index
     *
     * @example
     * fn.found('this is my string'.indexOf('this')) //=> true
     * fn.found('this is my string'.indexOf('my')) //=> true
     * fn.found('this is my string'.indexOf('that')) //=> false
     *
     * @returns {boolean}
     */
    function found(index) {
        return _.isNumber(index) && index >= 0;
    }

    /**
     * Curried form of _.invoke that works with a single object.
     * Useful when you are mapping over a collection and you want to call a method on each object that returns a value.
     * Similar to `.map('.method')` in Bacon.
     *
     * @param {string} method
     *
     * @example
     * _.map([{isTrue: fn.constant(false)}, {isTrue: fn.constant(true)}], fn.invoke('isTrue')) // => [false, true]
     *
     * @returns {Function}
     */
    function invoke(method/*, args*/) {
        var args = slice.call(arguments, 1);

        return function(obj) {
            return (typeof obj[method] === 'function') ? obj[method].apply(obj, args) : undefined;
        };
    }

    /**
     * The inverse of {@link dot}. Takes an object and returns a function for looking up keys in that object.
     * @param {Object} map - object to lookup properties within.
     *
     * @example
     * var myObj = {foo: 'bar', x:'y'};
     *
     * _.map(['foo', 'x'], lookup(myObj)) //=> ['bar', 'y']
     *
     * @returns {Function}
     */
    function lookup(map) {
        return function(key) {
            return map[key];
        };
    }

    /**
     * Curries the application of any function to `!` and some arguments.
     * In other words lazily inverts any function.
     * @param {Function} fn
     *
     * @example
     * _.map(['a', 'b', 'c'], fn.not(fn.eq('a'))) //=> [false, true, true]
     *
     * @returns {Function}
     */
    function not(fn) {
        return function(/*arguments*/) {
            return !fn.apply(this, arguments);
        };
    }

    /**
     * Partially apply from the right rather than the left
     * @param {Function} fn
     *
     * @example
     * fn.partialRight(function(){return arguments}, 3, 4)(1, 2) //=> [1, 2, 3, 4]
     *
     * @returns {Function}
     */
    function partialRight(fn /*, arguments*/) {
        var partialArgs = slice.call(arguments, 1);

        return function(){
            return fn.apply(this, slice.call(arguments).concat(partialArgs));
        };
    }

    /**
     * Return a function that will call the passed function with one of the incoming arguments spread out (if it's an array).
     * @param {Function} intoFn - the function to call with spread arguments
     * @param {number} [index=0] - the index of the parameter to spread
     *
     * @example
     * var varFunc = spread(func, 2);
     *
     * varFunc(1,2,[3,4],5) === func(1,2,3,4,5)
     * varFunc(1,2,3,4,5) === func(1,2,3,4,5)
     *
     * @returns {Function}
     */
    function spread(intoFn, index) {
        return function() {
            if (arguments.length <= index) {
                return intoFn.apply(this, arguments);
            }

            // arguments.splice(index, 1, ...arguments[index])
            var args = slice.call(arguments);
            args.splice.apply(args, [index || 0, 1].concat(args[ index || 0]));

            return intoFn.apply(this, args);
        };
    }

    /**
     * Map the context of a function call to a param.
     * Mainly used for jQuery which sticks the target element in `this` for callbacks.
     * This way you can `.bind` the callback to a different scope and still have easy access to the target element.
     * It also makes it easier to reuse API methods as handlers.
     * `fn` will be called with `this` as the first param, then the rest of the original arguments
     * @param {Function} fn
     *
     * @example
     * $(document).click(fn.thisToParam(function(){console.log(arguments)})) //=> [document, jQuery.Event]
     *
     * @returns {Function}
     */
    function thisToParam(fn){
        return function(/*arguments*/){
            var args = slice.call(arguments);
            args.unshift(this);
            return fn.apply(this, args);
        };
    }

    exports.arity = arity;
    exports.constant = constant;
    exports.defaultValue = defaultValue;
    exports.dot = dot;
    exports.eq = eq;
    exports.flip = flip;
    exports.found = found;
    exports.invoke = invoke;
    exports.lookup = lookup;
    exports.not = not;
    exports.partialRight = partialRight;
    exports.spread = spread;
    exports.thisToParam = thisToParam;
    exports.unary = partialRight(arity, 1);
    exports.binary = partialRight(arity, 2);
});