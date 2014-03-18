define('util/events', [
    'backbone-raw', // we rely on raw Backbone to avoid a circular dep between util/ajax, util/events, and backbone
    'util/events/internal'
], function (
    Backbone,
    eve
) {

    'use strict';

    var events = {
        /**
         * @param {string} eventName The name of the event to fire. This should be a '.'-delimited namespace
         * @param {Object} context The context to fire the event with. Handlers will be called with the context as `this`
         * Any further params will be used as arguments to the handlers.
         */
        trigger : function(eventName, context/*, ...args*/) {
            return eve.apply(this, arguments);
        },
        /**
         * Call a function every time an event is fired.
         *
         * @param {string} eventName The name of the event to handle. This should be a '.'-delimited namespace
         *                           You can replace any component of the namespace with a '*' for wildcard matching.
         * @param {function} fn The handler function to call when the event is fired.
         */
        on : function(eventName, fn) {
            return eve.on(eventName, fn);
        },
        /**
         * Stop calling a function when an event is fired. The function is assumed to have previously been passed to
         * `.on` or `.once`
         *
         * @param {string} eventName The name of the event to stop handling. This should be a '.'-delimited namespace
         *                           You can replace any component of the namespace with a '*' for wildcard matching.
         * @param {function} fn The handler function to stop calling when the event is fired.
         */
        off : function(eventName, fn) {
            return eve.off(eventName, fn);
        },
        /**
         * Call a function the first time an event is fired.
         *
         * @param {string} eventName The name of the event to handle once. This should be a '.'-delimited namespace
         *                           You can replace any component of the namespace with a '*' for wildcard matching.
         * @param {function} fn The handler function to call the first time the event is fired.
         */
        once : function(eventName, fn) {
            return eve.once(eventName, fn);
        },
        /**
         * Return all handlers that would be triggered when an event is fired.
         * @param {string} eventName The name of the event to return handlers for.
         * @return {Array.<function>} an array of handler functions.
         */
        listeners : function(eventName) {
            return eve.listeners(eventName);
        },
        /**
         * Call this method to stop propagation of the currently firing event.
         */
        stop : function() {
            return eve.stop();
        },
        /**
         * Determine the current event name or whether the current event name includes a specific sub-name.
         * @param {string=} subname the subname to search for in the current event name (optional).
         * @return {string|boolean} Either returns the name of the currently firing event, or if a subname is passed in
         *                          it instead returns whether this event includes that subname.
         */
        name : function(subname) {
            return eve.nt(subname);
        },
        /**
         * Create an event mixin similar to Backbone.Events which also triggers events in the global event bus.
         *
         * Prototypes which are extended with a mixin
         *
         * @param {String} namespace the namespace to use when cascading local events to global events
         * @param {Object} [options] mixin options.
         * @param {boolean} [options.localOnly] whether the event should only be fired locally
         * @returns {Backbone.Events} an event mixin which can be used to extend any prototype
         */
        createEventMixin : function(namespace, options) {
            options = options || {};
            return _.extend({}, Backbone.Events, {
                /**
                 * @param {String} eventName
                 */
                trigger: function(eventName/*, ...args */) {
                    // Trigger local events before global events
                    var result = Backbone.Events.trigger.apply(this, arguments);
                    if (!options.localOnly) {
                        events.trigger.apply(events, [namespace + '/' + eventName, this].concat(Array.prototype.slice.call(arguments, 1)));
                    }
                    return result;
                }
            });
        },
        /**
         * Creates an event object that tracks all listeners and provides a convenience function {@code destroy()},
         * rather than manually having to call {@code off()} again.
         *
         * <pre><code>
         *     var chain = events.chain().on('a', callback).on('b', callback);
         *     ...
         *     chain.destroy();
         * </code></pre>
         *
         * @returns {{on: Function, destroy: Function}}
         */
        chain: function() {
            var that = this;
            var listeners = [];
            return {
                on: function(eventName, fn) {
                    that.on(eventName, fn);
                    listeners.push(function() {
                        that.off(eventName, fn);
                    });
                    return this;
                },
                destroy: function() {
                    // I would use map except that I want to avoid dependencies
                    for (var i = 0; i < listeners.length; i++) {
                        listeners[i]();
                    }
                    // Just in case someone wants to keep using it
                    listeners = [];
                }
            };
        }
    };

    return events;
});
