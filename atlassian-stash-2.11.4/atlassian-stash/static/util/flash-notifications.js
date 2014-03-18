define('util/flash-notifications', [
    'aui',
    'jquery',
    'underscore',
    'util/client-storage',
    'exports'
], function(
    AJS,
    $,
    _,
    clientStorage,
    exports) {

    'use strict';

    var STORAGE_KEY = 'flash-notifications';

    function load() {
        return clientStorage.getFlashItem(STORAGE_KEY);
    }

    function save(items) {
        if (items && items.length) {
            clientStorage.setFlashItem(STORAGE_KEY, items);
        } else {
            clientStorage.removeFlashItem(STORAGE_KEY);
        }

    }

    exports.getItem = function(key) {
        var value;
        var items = load();

        if (items && _.has(items, key)) {
            value = items[key];
            delete items[key];
        }
        save(items);
        return value || null;
    };

    /**
     * Add a notification to be displayed later. This is usually called right before a redirect.
     *
     * @param {String} message the message to be displayed
     * @param {String?} type the type of notification. Possible values are 'success', 'warning', 'error' and 'info'.
     *                       If not specified it defaults to 'success'
     */
    exports.addNotification = function(message, type) {
        type = type || 'success';
        var items = load() || [];
        items.push({
            message : message,
            type : type
        });
        save(items);
    };

    /**
     * Drain all stored notifications and attach them to the container.
     *
     * @param {HTMLElement|jQuery|String} container the container to attach the notifications to.
     * @param {String?} attachmentMethod jQuery method to call to attach the notification to the container.
     *                                   'html', 'append', 'prepend', 'before' and 'after' will all work.
     *                                   If not specified it defaults to 'append'
     */
    exports.attachNotifications = function(container, attachmentMethod) {
        attachmentMethod = attachmentMethod || 'append';
        var notificationContent = _.map(exports.drainNotifications(), function(notification) {
            return aui.message.message({
                content: AJS.escapeHtml(notification.message),
                type: notification.type
            });
        }).join('');

        if (notificationContent) {
            $(container)[attachmentMethod](notificationContent);
        }
    };

    /**
     * drain the currently stored notifications.
     *
     * @returns {Array} the notifications
     */
    exports.drainNotifications = function() {
        return load();
    };

});