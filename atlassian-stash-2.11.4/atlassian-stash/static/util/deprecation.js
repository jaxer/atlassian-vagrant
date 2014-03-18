define('util/deprecation', [
    'util/events',
    'util/text'
], function(
    events,
    textUtil
    ) {

    'use strict';

    var has = Object.prototype.hasOwnProperty;
    var toString = Object.prototype.toString;

    /**
     * Return a function that logs a deprecation warning to the console the first time it is called. 
     * 
     * @param {string|Function} displayNameOrShowMessageFn the name of the thing being deprecated. Alternatively, a function to be returned
     * @param {string?} alternativeName the name of the alternative thing to use
     * @param {string?} sinceVersion the version this has been deprecated since
     * @param {string?} removeInVersion the version this will be removed in
     * @return {Function} that logs the warning
     */
    function getShowDeprecationMessage(displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion) {
        if (typeof displayNameOrShowMessageFn === 'function') {
            return displayNameOrShowMessageFn;
        }
        var called = false;
        return function() {
            if (!called) {
                called = true;
                var message = textUtil.toSentenceCase(displayNameOrShowMessageFn) + " has been deprecated" + (sinceVersion ? " since " + sinceVersion : '') +
                              " and will be removed in " + (removeInVersion || "a future release") + ".";
                if (alternativeName) {
                    message += " Use " + alternativeName + " instead.";
                }

                var err = new Error();
                var stack = err.stack || err.stacktrace;
                var stackMessage = (stack && stack.replace(/^Error\n/, "")) || 'No stack trace of the deprecated usage is available in your current browser.';
                console.log(message + "\n" + stackMessage);
            }
        };
    }

    /**
     * Returns a wrapped version of the function that logs a deprecation warning when the function is used.
     * @param {Function} fn the fn to wrap
     * @param {string|Function} displayNameOrShowMessageFn the name of the fn to be displayed in the message. Alternatively, a function to log deprecation warnings
     * @param {string} alternativeName the name of an alternative function to use
     * @param {string} sinceVersion the version this has been deprecated since
     * @param {string} removeInVersion the version this will be removed in
     * @return {Function} wrapping the original function
     */
    function deprecateFunctionExpression(fn, displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion) {
        var showDeprecationMessage = getShowDeprecationMessage(displayNameOrShowMessageFn || fn.name || 'this function', alternativeName, sinceVersion, removeInVersion);
        return function() {
            showDeprecationMessage();
            return fn.apply(this, arguments);
        };
    }

    /**
     * Returns a wrapped version of the constructor that logs a deprecation warning when the constructor is instantiated.
     * @param {Function} constructorFn the constructor function to wrap
     * @param {string|Function} displayNameOrShowMessageFn the name of the fn to be displayed in the message. Alternatively, a function to log deprecation warnings
     * @param {string} alternativeName the name of an alternative function to use
     * @param {string} sinceVersion the version this has been deprecated since
     * @param {string} removeInVersion the version this will be removed in
     * @return {Function} wrapping the original function
     */
    function deprecateConstructor(constructorFn, displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion) {
        var deprecatedConstructor = deprecateFunctionExpression(constructorFn, displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion);
        deprecatedConstructor.prototype = constructorFn.prototype;

        return deprecatedConstructor;
    }


    var supportsProperties = false;
    try {
        if (Object.defineProperty) {
            Object.defineProperty({}, 'blam', { get : function() {}, set: function() {} });
            supportsProperties = true;
        }
    } catch(e) {
        /* IE8 doesn't support on non-DOM elements */
    }

    /**
     * Wraps a "value" object property in a deprecation warning in browsers supporting Object.defineProperty
     * @param {Object} obj the object containing the property
     * @param {string} prop the name of the property to deprecate
     * @param {string|Function} displayNameOrShowMessageFn the display name of the property to deprecate (optional, will fall back to the property name). Alternatively, a function to log deprecation warnings
     * @param {string} alternativeName the name of an alternative to use
     * @param {string} sinceVersion the version this has been deprecated since
     * @param {string} removeInVersion the version this will be removed in
     */
    function deprecateValueProperty(obj, prop, displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion) {
        if (supportsProperties) {
            var oldVal = obj[prop];
            var showDeprecationMessage = getShowDeprecationMessage(displayNameOrShowMessageFn || prop, alternativeName, sinceVersion, removeInVersion);
            Object.defineProperty(obj, prop, {
                get : function () {
                    showDeprecationMessage();
                    return oldVal;
                },
                set : function(val) {
                    oldVal = val;
                    showDeprecationMessage();
                    return val;
                }
            });
        } else {
            // Browser doesn't support properties, so we can't hook in to show the deprecation warning.
        }
    }

    /**
     * Wraps an object property in a deprecation warning, if possible. functions will always log warnings, but other
     * types of properties will only log in browsers supporting Object.defineProperty
     * @param {Object} obj the object containing the property
     * @param {string} prop the name of the property to deprecate
     * @param {string|Function} displayNameOrShowMessageFn the display name of the property to deprecate (optional, will fall back to the property name). Alternatively, a function to log deprecation warnings
     * @param {string} alternativeName the name of an alternative to use
     * @param {string} sinceVersion the version this has been deprecated since
     * @param {string} removeInVersion the version this will be removed in
     */
    function deprecateObjectProperty(obj, prop, displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion) {
        if (typeof obj[prop] === 'function') {
            obj[prop] = deprecateFunctionExpression(obj[prop], displayNameOrShowMessageFn || prop, alternativeName, sinceVersion, removeInVersion);
        } else {
            deprecateValueProperty(obj, prop, displayNameOrShowMessageFn, alternativeName, sinceVersion, removeInVersion);
        }
    }

    function deprecateAllProperties(obj, objDisplayPrefix, alternativeNamePrefix, sinceVersion, removeInVersion) {
        for(var attr in obj) {
            if (has.call(obj, attr)) {
                deprecateObjectProperty(obj, attr, objDisplayPrefix + attr, alternativeNamePrefix + attr, sinceVersion, removeInVersion);
            }
        }
    }

    // These properties will not be touched since Backbone uses them on the model itself.
    // But the deprecation should "just work" because they are synonymous with the attributes.
    var whitelistedProperty = "id";
    // These properties cannot be deprecated well since Backbone uses them on the model itself.
    // We throw early when they are deprecated.
    var blacklistedProperties = /^(attributes|url|isNew|hasChanged|changed(Attributes)|previous(Attributes)|clone)$/;

    /**
     * This function will deprecate a json property on an object that has been converted to a Brace.Model
     * @param {Brace.Model} BraceModel the Brace.Model class that contains the attribute.
     * @param {string} className the name of the Brace.Model class
     * @param {string} attr the name of the attribute to deprecate
     * @param {string} sinceVersion the version this has been deprecated since
     * @param {string} removeInVersion the version this will be removed in
     */
    function deprecateJsonModelProp(BraceModel, className, attr, sinceVersion, removeInVersion) {
        if (whitelistedProperty === attr) {
            return;
        }
        if (blacklistedProperties.test(attr)) {
            throw new Error("The property " + attr + " cannot be deprecated when converting to a Brace model.");
        }
        if (supportsProperties) {
            var showDeprecationMessage = getShowDeprecationMessage(
                className + '::' + attr,
                className + "::get|set('" + attr + "')",
                sinceVersion, removeInVersion);

            Object.defineProperty(BraceModel.prototype, attr, {
                get : function () {
                    showDeprecationMessage();
                    return this.get(attr);
                },
                set : function(val) {
                    showDeprecationMessage();
                    this.set(attr, val);
                }
            });
        } else {
            // Browser doesn't support properties, so we can't hook in to show the deprecation warning.
        }
    }

    /**
     * This function will deprecate a JSON model in favor of a Brace.Model
     * @param {Brace.Model} BraceModel the Brace.Model class that has replaced a JSON model
     * @param {string} className the name of the Brace.Model class
     * @param {string} sinceVersion the version in which the JSON became a Brace model
     * @param {string} removeInVersion the version in which the JSON attributes will be removed.
     */
    function deprecateJsonModel(BraceModel, className, sinceVersion, removeInVersion) {
        var namedAttrs = BraceModel.prototype.namedAttributes;
        var attr;
        if (toString.call(namedAttrs) === '[object Array]') {
            var i = namedAttrs.length;
            while(i--) {
                deprecateJsonModelProp(BraceModel, className, namedAttrs[i], sinceVersion, removeInVersion);
            }
        } else {
            for(attr in namedAttrs) {
                if (has.call(namedAttrs, attr)) {
                    deprecateJsonModelProp(BraceModel, className, attr, sinceVersion, removeInVersion);
                }
            }
        }

        if (!supportsProperties) {
            // Setting the deprecated property will never work in these browsers,
            // but we can at least keep the value updated for reads
            var set = BraceModel.prototype.set;
            BraceModel.prototype.set = function(prop, val) {
                set.apply(this, arguments);
                if (prop && typeof prop === 'object') {
                    for (var attr in prop) {
                        if (has.call(prop, attr)) {
                            this[attr] = prop[attr];
                        }
                    }
                } else {
                    this[prop] = val;
                }
            };
        }
    }

    /**
     * Deprecate an attribute of a brace model by deprecating the getFoo and setFoo convenience methods.
     * @param {function} BraceModel the Brace.Model with the attribute to deprecate
     * @param {string} attributeName the name of the attribute to deprecate
     * @param {string} alternativeName the name or instructions for the alternative
     * @param {string} sinceVersion the version that the attribute was deprecated
     * @param {string} removeInVersion the version that the attribute will be removed
     */
    function deprecateBraceAttribute(BraceModel, attributeName, alternativeName, sinceVersion, removeInVersion) {
        if (has.call(BraceModel.prototype.namedAttributes, attributeName)) {
            var SentenceCaseAttribute = textUtil.toSentenceCase(attributeName);

            BraceModel.prototype['get' + SentenceCaseAttribute] = deprecateFunctionExpression(BraceModel.prototype['get' + SentenceCaseAttribute],
                attributeName, alternativeName, sinceVersion, removeInVersion);

            BraceModel.prototype['set' + SentenceCaseAttribute] = deprecateFunctionExpression(BraceModel.prototype['set' + SentenceCaseAttribute],
                attributeName, alternativeName, sinceVersion, removeInVersion);
        }
    }

    /**
     * Deprecates the Brace methods on a model that should now be referenced as read-only JSON.
     *
     * NOTE: This should rarely be used. It is currently used for a bug that leaked into our API.
     *
     * @param {Brace.Model} braceModel the model to deprecate and replace with raw JSON
     * @param {string} sinceVersion the version that the model was deprecated
     * @param {string} removeInVersion the version that the model will be removed
     */
    function deprecateJsonAsBraceModel(braceModel, sinceVersion, removeInVersion) {
        braceModel = braceModel.clone();
        var json = braceModel.toJSON();
        var attr;

        // Use a single deprecation message for all properties
        // This avoids calls that cause 4-6 warnings to pop up at once E.g.,
        //      if you call .getMyProp(), which internally calls .get('myProp'), which accesses .attributes, etc...
        var deprecationMessageFn = getShowDeprecationMessage(
            "use of this object's Backbone properties",
            "raw JSON properties on this object", sinceVersion, removeInVersion);


        for(attr in braceModel) {
            // No hasOwnProperty check - we want to handle everything accessible from this model
            // that won't already be handled as raw json later
            if (!has.call(json, attr)) {
                deprecateObjectProperty(braceModel, attr, deprecationMessageFn);
            }
        }

        // add the raw json properties onto the object
        for (attr in json) {
            if (has.call(json, attr)) {
                braceModel[attr] = json[attr];
            }
        }

        return braceModel;
    }


    var eventDeprecations = {};

    /**
     * @param {string} eventName
     * @param {*} context
     * @param {*} args excess arguments are passed to the handlers as
     * @param {string?} alternativeName the name of the alternative thing to use
     * @param {string?} sinceVersion the version this has been deprecated since
     * @param {string?} removeInVersion the version this will be removed in
     */
    function triggerDeprecated(eventName, context/*, ...args, alternativeName, sinceVersion, removeInVersion*/) {
        if (events.listeners(eventName).length) {
            if (arguments.length < 5) {
                throw new Error("eventName, context, alternativeName, sinceVersion, and removeInVersion must all be provided (but can be null).");
            }
            var triggerArgs = Array.prototype.slice.call(arguments, 0, arguments.length - 3);
            var alternativeName = arguments[arguments.length - 3];
            var sinceVersion = arguments[arguments.length - 2];
            var removeInVersion = arguments[arguments.length - 1];
            var showMessage = eventDeprecations[eventName] ||
                              (eventDeprecations[eventName] =
                                getShowDeprecationMessage("Event '" + eventName + "'", "'" + alternativeName + "'", sinceVersion, removeInVersion));
            showMessage();
            events.trigger.apply(events, triggerArgs);
        }
    }

    return {
        fn : deprecateFunctionExpression,
        construct : deprecateConstructor,
        prop : deprecateObjectProperty,
        obj : deprecateAllProperties,
        braceAsJson : deprecateJsonModel,
        braceAttribute: deprecateBraceAttribute,
        jsonAsBrace : deprecateJsonAsBraceModel,
        triggerDeprecated : triggerDeprecated,
        propertyDeprecationSupported : supportsProperties,
        getMessageLogger : getShowDeprecationMessage
    };
});
