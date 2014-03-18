define('util/scroll', [
    'jquery',
    'util/feature-detect',
    'exports'
], function(
    $,
    featureDetect,
    exports
    ) {

    'use strict';

    var defaults = {
        waitForImages: false,   // Good for scrolling on page load
        cancelIfScrolled: false,
        duration: 400,
        getScrollPadding: function() {
            return document.documentElement.clientHeight / 4;
        }
    };

    function scroll(destination, padding, duration) {
        $('html, body').animate({
            scrollTop: Math.max(0, destination - padding)
        }, duration);
    }

    function scrollTo($el, options) {
        var opts = $.extend({}, defaults, options);

        var cancelScroll = false;
        if (opts.cancelIfScrolled) {
            $(document).one('scroll', function() { cancelScroll = true; });
        }

        function scrollIfNotCancelled() {
            if (!cancelScroll) {
                var offset = $el.offset();
                if (offset) { // $el is still in DOM and visible
                    scroll(offset.top, opts.getScrollPadding(), opts.duration);
                }
            }
        }

        if (opts.waitForImages) {
            $(document).imagesLoaded(scrollIfNotCancelled);
        } else {
            scrollIfNotCancelled();
        }
    }


    /**
     * Given a fixed or absolute-ly positioned "content" element, return a function to scroll it
     * in a "fake" way using transform: translate() or top: and left: depending on the browser.
     *
     * This simulates a container element being scrolled.
     *
     * @param {HTMLElement} el - the element representing "contents"
     * @returns {Function} a function that takes in a scrollLeft and scrollTop for the contents
     */
    function fakeScroll(el) {
        var transformProp = featureDetect.cssTransform();
        var cachedPos = { left: 0, top: 0 };

        /**
         * Cache the scroll position
         * @param {?number} left
         * @param {?number} top
         * @returns {{left: ?number, top: ?number}}
         */
        function cachedScrollPosition(left, top) {
            cachedPos.left = (left == null ? cachedPos.left : left);
            cachedPos.top  = (top == null  ? cachedPos.top : top);
            return cachedPos;
        }

        var transformer;
        switch (transformProp) {
            case 'msTransform':
                transformer = function(scrollPos) {
                    el.style[transformProp] = 'translate(' + -Math.round(scrollPos.left) + 'px, ' + -Math.round(scrollPos.top) + 'px)';
                };
                break;
            case undefined:
                transformer = function(scrollPos) {
                    el.style.left = -Math.round(scrollPos.left);
                    el.style.top = -Math.round(scrollPos.top);
                };
                break;
            default:
                transformer = function(scrollPos) {
                    el.style[transformProp] = 'translate3d(' + -Math.round(scrollPos.left) + 'px, ' + -Math.round(scrollPos.top) + 'px, 0)';
                };
        }

        return _.compose(transformer, cachedScrollPosition);
    }

    exports.scrollTo = scrollTo;
    exports.fakeScroll = fakeScroll;
});