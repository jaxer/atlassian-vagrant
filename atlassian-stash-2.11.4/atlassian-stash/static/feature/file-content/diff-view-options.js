define('feature/file-content/diff-view/diff-view-options', [
    'util/deprecation',
    'feature/file-content/diff-view-options'
], function(
    deprecate,
    options) {

    deprecate.getMessageLogger(
        'feature/file-content/diff-view/diff-view-options',
        'feature/file-content/diff-view-options', '2.11', '3.0')();

    return options;
});

define('feature/file-content/diff-view-options', [
    'underscore',
    'util/deprecation',
    'util/events',
    'util/client-storage'
], function (
    _,
    deprecate,
    events,
    clientStorage
) {

    "use strict";

    // Make sure the storageKey only gets initialized when required
    var storageKey = _.memoize(function() { return clientStorage.buildKey(['diff-view', 'options'], 'user'); });

    function DiffViewOptions() {}

    /**
     * Lazily initialize our options here and cache them for future access.
     *
     * @returns {Object}
     */
    DiffViewOptions.prototype.getOptions = _.memoize(function(){
        return _.extend({}, this.defaults, clientStorage.getItem(storageKey()));
    });

    DiffViewOptions.prototype.defaults = {
        ignoreWhitespace: false,
        diffType: 'unified'
    };

    /**
     * Trigger the currently viewed file to update.
     *
     * Usually after an option has been changed.
     *
     * @param {string} key
     * @param {string} value
     */
    DiffViewOptions.prototype.triggerUpdate = function(key, value) {
        events.trigger('stash.feature.fileContent.optionsChanged', null, {
            key: key,
            value: value
        });

        // Deprecate the diffview.optionsChanged event, since the original didn't have a context, we pass in `null` here
        deprecate.triggerDeprecated('stash.feature.diffview.optionsChanged', undefined,
            'stash.feature.fileContent.optionsChanged', '2.11', '3.0');
    };


    /**
     * Set a diff option
     *
     * We use a setter so that we can keep an internal reference to the
     * key/value pair while also updating clientStorage
     *
     * @param {string} key
     * @param {*} value
     * @param {boolean} [update] trigger an update event?
     */
    DiffViewOptions.prototype.set = function(key, value, update){
        this.getOptions()[key] = value;
        //Also update storage
        clientStorage.setItem(storageKey(), this.getOptions());

        // trigger an update when we save the option.
        if (update !== false) {
            this.triggerUpdate(key, value);
        }
    };

    /**
     * Get a diff option
     *
     * @param {string} key
     * @returns {*}
     */
    DiffViewOptions.prototype.get = function(key){
        return this.getOptions()[key];
    };

    return new DiffViewOptions();
});
