(function(window) {

    'use strict';

    var hasOwn = Object.prototype.hasOwnProperty,
        callbacks  = {},
        previousRequire = window.require,
        previousDefine = window.define,
        modules;

    function callFrozen(fn, self, args) {
        return function() {
            fn.apply(self, args);
        };
    }

    var require = function (moduleName, callback) {

        var i, len;
        var arrayInput = moduleName instanceof Array;
        var moduleNames = arrayInput ? moduleName : [moduleName];
        var requiredModules = [];

        for (i = 0, len = moduleNames.length; i < len; i++) {
            if (!hasOwn.call(modules, moduleNames[i])) {
                evaluate(moduleNames[i]);
            }
            requiredModules.push(modules[moduleNames[i]]);
        }

        if (callback) {
            window.setImmediate ? setImmediate(callFrozen(callback, null, requiredModules)) : setTimeout(callFrozen(callback, null, requiredModules));
        }
        return arrayInput ? requiredModules : requiredModules[0];
    };

    var define = function (moduleName, dependencies, callback) {

        if (hasOwn.call(modules, moduleName) || hasOwn.call(callbacks, moduleName)) {
            throw new Error("Module '" + moduleName + "' is already defined.");
        }

        if (!callback) {// dependencies is optional
            callback = dependencies;
            dependencies = undefined;
        }

        callbacks[moduleName] = {
            dependencies : dependencies,
            callback : callback
        };
    };

    modules = {
        require : require,
        jquery : window.AJS ? window.AJS.$ : window.jQuery,
        underscore : window._,
        aui : window.AJS
    };

    function evaluate(moduleName) {
        var i, len, exports, dependencies, callback, c, hasExports, callbackResult;

        if (!hasOwn.call(callbacks, moduleName)) {
            throw new Error("Module '" + moduleName + "' has not yet been defined.");
        }

        exports = {};
        c = callbacks[moduleName];
        callback = c.callback;
        dependencies = c.dependencies;

        if (typeof callback === 'function') {
            modules[moduleName] = exports; // allow circular deps like AMD should.
            if (!dependencies || !dependencies.length) {
                callbackResult = callback(require, exports);
            } else {
                dependencies = dependencies.slice(0);

                for(i = 0, len = dependencies.length; i < len; i++) {
                    if (dependencies[i] === 'exports') {
                        dependencies[i] = exports;
                        hasExports = true;
                    } else {
                        dependencies[i] = require(dependencies[i]);
                    }
                }

                callbackResult = callback.apply(null, dependencies);
            }
        } else {
            callbackResult = callback;
        }

        modules[moduleName] = (hasExports || callbackResult === undefined) ? exports : callbackResult;
    }


    window.require = require;
    window.define = define;

    function noConflict() {
        window.require = previousRequire;
        window.define = previousDefine;

        return this;
    }

    require.noConflict = noConflict;
    define.noConflict = noConflict;

    window.requireLite = require; // Used for testing
    window.defineLite = define; // Used for testing
})(window || this);
