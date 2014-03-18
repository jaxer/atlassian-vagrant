define('util/dom-event', [
    'jquery',
    'underscore',
    'util/events',
    'util/navigator',
    'exports'
], function(
    $,
    _,
    events,
    navigator,
    exports) {

    'use strict';

    var isMac = window.navigator.platform.indexOf('Mac') !== -1;

    /**
     * Returns true if a mouse click event should be handled in the same tab, false otherwise
     * @param e a jquery mouse event
     */
    exports.openInSameTab = function (e) {
        return (!e.which || e.which === 1) &&
              !(e.metaKey || e.ctrlKey || e.shiftKey || (e.altKey && !$.browser.msie));
    };


    /* Returns true if a mouse click event was caused by a right button click, false otherwise*/
    exports.isRightClick = function(e) {
        return e.which === 3;
    };

    /* Return true if the ctrlKey is held down, or metaKey on Mac */
    exports.isCtrlish = function(e) {
        return isMac ? e.metaKey : e.ctrlKey;
    };

    /**
     * Linux: any modifier prevents scroll
     * FF: prevent scroll in Win and Mac when ANY modifier is pressed.
     * Chrome : Alt on Windows, Cmd on Mac handle history nav, and Shift on both OSes handles text highlighting.
     * Safari: Alt is history nav in Windows, Ctrl and Cmd both do it on Mac, and Shift only avoids scroll on Mac.
     * IE8-9: Alt key is history navigation.
     * @param e key event
     */
    exports.modifiersPreventScroll = function(e) {
        var result = false;

        if ($.browser.mozilla || (/Linux/).test(navigator._getPlatform())) {

            result = isAnyModifierPressed(e);

        } else if ($.browser.webkit && (/Chrome/).test(navigator._getUserAgent())) {

            result = e.shiftKey || ((/Win/).test(navigator._getPlatform()) ? e.altKey : e.metaKey);

        } else if ($.browser.safari) {

            result = (/Win/).test(navigator._getPlatform()) ? e.altKey : isAnyModifierPressed(e);

        } else if ($.browser.msie) {

            result = e.altKey;

        }

        // Ensure the result is really a boolean, not just a truthy/falsy value
        return !!result;
    };

    function isAnyModifierPressed(e) {
        return e.altKey || e.shiftKey || e.ctrlKey || e.metaKey;
    }

    /**
     * When enabled, this function will send an event when a user changes their font size.
     */
    exports.listenForFontSizeChange = _.once(function() {
        var heightTest = $('<div style="position: fixed; visibility: hidden; speak: none; height: auto; top: -999px; left: -999px;">Ignore this text</div>').appendTo(document.body),
            heightTestHeight = heightTest.height(),
            checkHeight,
            interval = 500;

        setTimeout(checkHeight = function() {
            var newHeight = heightTest.height();
            if (newHeight !== heightTestHeight) {
                heightTestHeight = newHeight;
                events.trigger('stash.util.events.fontSizeChanged');
            }
            setTimeout(checkHeight, interval);
        }, interval);
    });

    /**
     * Returns a function which prevents the default action for the event, then calls `func` with the supplied arguments
     * @param func
     */
    exports.preventDefault = function(func) {
        return function(e/*, rest*/) {
            e && _.isFunction(e.preventDefault) && e.preventDefault();

            if (_.isFunction(func)) {
                return func.apply(this, arguments);
            }
        };
    };
});
