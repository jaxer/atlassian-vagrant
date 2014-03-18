/**
 * WARNING: _PageDataPlugin is an underlying API, not meant for use by plugins.
 * This product MAY provide a wrapping, supported interface for working with page data.
 */
var _PageDataPlugin = (function() {

    'use strict';

    var has = Object.prototype.hasOwnProperty;

    var data = {};

    var readyHandlers = {};
    function isReady(completeModuleKey, context) {
        return !!data[completeModuleKey] && data[completeModuleKey][context];
    }
    function addReadyHandlers(completeModuleKey, context, handlers) {
        if (!readyHandlers[completeModuleKey]) {
            readyHandlers[completeModuleKey] = {};
        }
        if (!readyHandlers[completeModuleKey][context]) {
            readyHandlers[completeModuleKey][context] = [];
        }
        var handlerList = readyHandlers[completeModuleKey][context];
        handlerList.push.apply(handlerList, handlers);
    }
    function callReadyHandlers(completeModuleKey, context, handlers) {
        if (!isReady(completeModuleKey, context)) {
            return;
        }

        if (!handlers) {
            if (!readyHandlers[completeModuleKey] || !readyHandlers[completeModuleKey][context]) {
                return;
            }
            handlers = readyHandlers[completeModuleKey][context];
        }

        var handlerData = data[completeModuleKey] && data[completeModuleKey][context];
        for(var i = 0, len = handlers.length; i < len; i++) {
            handlers[i](handlerData);
        }
    }

    function load(context, dataByCompleteModuleKey) {
        for(var pluginKey in dataByCompleteModuleKey) {
            if (has.call(dataByCompleteModuleKey, pluginKey)) {
                var pluginData = data[pluginKey] || (data[pluginKey] = {});

                if (has.call(pluginData, context)) {
                    throw new Error("Attempt to set context " + context + " for plugin key " + pluginKey + " multiple times.");
                }

                pluginData[context] = dataByCompleteModuleKey[pluginKey];
                callReadyHandlers(pluginKey, context);
            }
        }
        callReadyHandlers(readyHandlers);
    }

    return {
        load: load,
        data : data,
        ready : function(completeModuleKey, context/*, ...handlers*/) {
            var handlers = Array.prototype.slice.call(arguments, 2);
            if (isReady(completeModuleKey, context)) {
                callReadyHandlers(completeModuleKey, context, handlers);
            } else {
                addReadyHandlers(completeModuleKey, context, handlers);
            }
        }
    };
}());
