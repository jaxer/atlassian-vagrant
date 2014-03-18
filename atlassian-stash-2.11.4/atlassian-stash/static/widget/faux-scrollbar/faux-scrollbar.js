define('widget/faux-scrollbar', [
    'jquery',
    'underscore',
    'util/dom-event',
    'util/events',
    'util/function'
], function (
    $,
    _,
    domEventUtil,
    events,
    fn
    ) {

    'use strict';

    /**
     * Creates a fake HORIZONTAL scrollbar that is fixed to the bottom of the window.
     * This scrollbar can be attached to a "puppet" element on the page, and will cause events on the window
     * to be reflected in the scroll of that puppet element.
     *
     * FauxScrollbar will intercept left and right arrow keys, mousewheel events, and manual scrolling on the document.
     *
     * Usage:
     * var fauxbar = new FauxScrollbar();
     *
     * fauxbar.init(document.getElementById('puppet')); // fauxbar is now connected to #puppet.
     *
     * fauxbar.destroy(); //fauxbar is disconnected from #puppet, removed from the page, and can no longer be used.
     *
     * NOTE: If another element on the page has overflow: auto or scroll, it must preventDefault on all the
     * appropriate events to avoid two divs being scrolled simultaneously.  In the future, FauxScrollbar SHOULD
     * implement a fauxbar.ignoreElement(unrelatedElement) function which will prevent the duplicated scrolling.
     */
    function FauxScrollbar() {
        this._scroller = document.createElement('div');
        this._scrollee = document.createElement('div');
        this._scroller.appendChild(this._scrollee);

        this._scroller.className = 'faux-scrollbar';
        this._scrollee.className = 'scrollee';

        // We shouldn't do this with live JS because the scroller height is 0 when unneeded and will flicker between states.
        // We could do it with a test ahead of time, but I don't see the need for it yet. 17 is as big as they come currently.
        // If someone complains we can grab a value specific to their browser at page load.
        this._scrollerHeight = 17;

        if ($.browser.msie) { // IE requires content to be visible to allow scrolling on clicking the scrollbar.
            //so add a 1px sliver of transparent 'content' above the scrollbar.  No one will know.
            this._scroller.style.height = '18px';
        }

        document.body.appendChild(this._scroller);

        this._userActivatedScroll = true;
        this._firstInit = true;

        this._contentWidth = 0;
    }

    /**
     * Connect up all our key, mouse, resize, and scroll events to window, document, and the faux scrollbar element.
     */
    FauxScrollbar.prototype._onFirstInit = function() {
        var self = this;

        // _userActivatedScroll is used to stop infinite loops between the faux scrollbar element and the puppet element.
        // it is set to false before taking an action that is expected to cause the partner event handler to fire.
        this._scroller.onscroll = function() {
            if (self._userActivatedScroll) {
                self._userActivatedScroll = false;
                self._puppet.scrollLeft = self._scroller.scrollLeft * self._scrollLeftRatio;
            } else {
                self._userActivatedScroll = true;
            }
        };

        var shiftKeyDown = false;

        var SHIFT = 16,
            LEFT_ARROW = 37,
            RIGHT_ARROW = 39;
        $(document).on('keydown.fauxscrollbar', function (e) {
            var keyCode = e.keyCode,
                isArrow = _.any([RIGHT_ARROW, LEFT_ARROW], fn.eq(keyCode));
            if (isArrow && !domEventUtil.modifiersPreventScroll(e)) {

                var target = e.target,
                    ignore = target && /INPUT|SELECT|TEXTAREA/i.test(target.tagName);

                if (!ignore) {
                    if (keyCode === RIGHT_ARROW) {
                        self._scroller.scrollLeft += 40;
                    } else if (keyCode === LEFT_ARROW) {
                        self._scroller.scrollLeft -= 40;
                    }
                }
            } else if (keyCode === SHIFT) {
                shiftKeyDown = true;
            }
        });

        $(document).on('keyup.fauxscrollbar', function (e) {
            if (e.keyCode === SHIFT) {
                shiftKeyDown = false;
            }
        });

        // Firefox supports only DOMMouseScroll for trackpads and mouse wheels,
        // IE doesn't support anything on a trackpad (but doesn't support two-finger horizontal scrolling anyway, so no loss of functionality)
        // Webkit uses mousewheel events for trackpad two-finger scrolling
        // IE and Webkit appropriately listen to mousewheel on literal mouse wheel (the wheel on your mouse) scrolling.

        // DOMMouseScroll positives are up and left (without OSX natural scrolling, Firefox automatically flips the sign)
        // mousewheel positives are down and right (without OSX natural scrolling, Webkit has a flag to check, Safari also already flips the sign)

        var isFirefox = $.browser.mozilla;
        var isChrome = $.browser.webkit && (/Chrome/).test(navigator.userAgent);
        if (isFirefox) {
            $(document).on('DOMMouseScroll.fauxscrollbar', function (e) {
                e = e.originalEvent;

                var clicks = shiftKeyDown || (e.axis === e.HORIZONTAL_AXIS) ?
                             e.detail :
                             0;

                if (clicks) {
                    self._scroller.scrollLeft += clicks * 100;
                }
            });
        } else {
            // SHIFT + mousewheel does horizontal scrolling in Webkit.
            $(document).on('mousewheel.fauxscrollbar', function (e) {
                e = e.originalEvent;

                var delta = e.wheelDeltaX || (shiftKeyDown && e.wheelDelta) || 0,
                    clicks = (delta / 120) || (shiftKeyDown && e.detail);

                if (clicks) {
                    if (isChrome && e.webkitDirectionInvertedFromDevice) {
                        clicks = -clicks;
                    }
                    self._scroller.scrollLeft -= clicks * 100;
                }
            });
        }

        $(window).on('resize.fauxscrollbar', function() {
            self._hideIfAbovePuppet();
            self._setContentWidthIfKnown();
            self._updateContainerWidths();
            self._updateScrollLeftRatio();
        }).on('scroll.fauxscrollbar', function() {
            self._hideIfAbovePuppet();
        });
    };

    /**
     * Attach the faux scrollbar to a puppet element. The faux scrollbar will initially match the puppet's scrollLeft,
     * and thereafter the scrollbars will be mirrored.
     *
     * @param {HTMLElement} puppetEl the element to attach to.
     * @param {Object} [opts] see {@link setOptions} for details
     */
    FauxScrollbar.prototype.init = function(puppetEl, opts) {
        var self = this;

        if (this._firstInit) {
            this._onFirstInit();
            this._firstInit = false;
        }

        if (this._puppet) {
            $(this._puppet).off('.fauxscrollbar');
        }

        this._puppet = puppetEl;

        this._contentWidth = 0;
        this._setContentWidthIfKnown(true);

        if (opts) {
            this.setOptions(opts);
        } else {
            this._updateContainerWidths();
            this._updateScrollLeftRatio();
        }

        $(this._puppet)
            .on('scroll.fauxscrollbar', function() {
                if (self._userActivatedScroll) {
                    self._userActivatedScroll = false;
                    self._scroller.scrollLeft = self._puppet.scrollLeft / self._scrollLeftRatio;
                } else {
                    self._userActivatedScroll = true;
                }
            })
            .scroll();
        self._userActivatedScroll = true;
    };


    var dirs = ['top', 'left', 'bottom', 'right'];
    /**
     * @param {Object} options
     * @param {string|number} [options.top] top value for positioning
     * @param {string|number} [options.bottom] bottom value for positioning
     * @param {string|number} [options.left] left value for positioning
     * @param {string|number} [options.right] right value for positioning
     * @param {number|boolean} [options.hideAbove=true] Whether the scrollbar should hide itself when above the top of the puppet element.
     *                                                  If a number is given, it will hide itself when window.scrollTop is less than that number
     */
    FauxScrollbar.prototype.setOptions = function(options) {
        var $scroller = $(this._scroller);
        var anySet = _.some(dirs, _.bind(_.has, _, options));
        if (anySet) {
            _.each(dirs, function(dir) {
                $scroller.css(dir, options[dir] != null ? options[dir] : 'auto');
            });
        }
        if (_.has(options, 'hideAbove')) {
            this._hideAbove = options.hideAbove;
        }

        this._updateContainerWidths();
        this._updateScrollLeftRatio();
    };

    /**
     * Alias for {@link setOptions}
     * @function
     * @deprecated since 2.11
     * @type {Function}
     */
    FauxScrollbar.prototype.setPosition = FauxScrollbar.prototype.setOptions;

    /**
     * Remove the faux scrollbar from the page and disconnect from the puppet.
     * After this, the faux scrollbar ccan no longer be used.
     */
    FauxScrollbar.prototype.destroy = function() {
        $(document).off('.fauxscrollbar');
        $(window).off('.fauxscrollbar');

        if (this._puppet) {
            $(this._puppet).off('.fauxscrollbar');
        }

        this._scroller.onscroll = null;

        this._scroller.parentNode.removeChild(this._scroller);

        this._puppet = this._scroller = this._scrollee = null;
    };

    /**
     * Sets the _contentWidth property IF we can determine it.
     * Returns true if we know its value, or false if we don't.
     *
     * @param hardRefresh forces a reset of the contentWidth, even if our knowledge about its width didn't change.
     */
    FauxScrollbar.prototype._setContentWidthIfKnown = function(hardRefresh) {
        var puppetClientWidth,
            puppetScrollWidth;

        var widthAlreadyKnown = this._contentIsClipped;

        // only do work if we are hard refreshing OR we don't yet know the width of the content
        // avoid reading DOM properties if we can help it
        if (hardRefresh || !widthAlreadyKnown) {
            this._contentIsClipped = (puppetClientWidth = this._puppet.clientWidth) &&
                                     (puppetScrollWidth = this._puppet.scrollWidth) > puppetClientWidth;

            if (this._contentIsClipped) { // we know the content width
                puppetScrollWidth = puppetScrollWidth || this._puppet.scrollWidth;
                this._contentWidth = puppetScrollWidth;
                return true;
            } else if (hardRefresh) { // We don't know the true width of the content, so we'll have to check again each window.resize.
                this._contentWidth = 0;
                return false;
            }
        }

        return this._contentIsClipped;
    };

    FauxScrollbar.prototype._updateScrollLeftRatio = function () {
        //ratio of the maximum scrollLefts (maxScrollLeftOfSource / maxScrollLeftOfScroller)
        this._scrollLeftRatio = (this._contentWidth - this._puppetWidth) / (this._scrolleeWidth - this._scrollerWidth);
    };

    /**
     * Internal method to update the cached width variables for the faux scrollbar and of the puppet element.
     */
    FauxScrollbar.prototype._updateContainerWidths = function () {
        this._scrollerWidth = this._scroller.clientWidth || this._scroller.offsetWidth; //IE8 can return 0 clientWidth
        this._puppetWidth = this._puppet.clientWidth || (this._contentWidth + 1); //IE8 can return 0 clientWidth, and in that case don't scroll.

        //scrollee should be the same width as the contentWidth, proprtional to window size.
        this._scrolleeWidth = Math.round(this._contentWidth * this._scrollerWidth / this._puppetWidth);
        this._scrollee.style.width = this._scrolleeWidth + 'px';
        events.trigger('stash.widget.faux.scrollbar.visibilityChanged', null, (this._scrolleeWidth >= this._scrollerWidth));
    };

    FauxScrollbar.prototype._hideIfAbovePuppet = function() {
        if (this._hideAbove === false) {
            return;
        }

        var $window = $(window),
            $puppet = $(this._puppet),
            $scroller = $(this._scroller);

        var shouldHide = $window.scrollTop() + $window.height() < (this._hideAbove || $puppet.offset().top) + this._scrollerHeight;

        if (shouldHide !== this._isHidden) {
            this._isHidden = shouldHide;
            $scroller.toggleClass('hidden', shouldHide);

            // just came out of hiding. Need to check our widths again
            if (!shouldHide) {
                this._setContentWidthIfKnown();
                this._updateContainerWidths();
                this._updateScrollLeftRatio();
            }
        }
    };

    /**
     * Used for testing.  Gets the faux scrollbar's current scrollLeft.
     */
    FauxScrollbar.prototype.getScrollLeft = function() {
        return this._scroller.scrollLeft;
    };

    /**
     * Used for testing.  Sets the faux scrollbar's current scrollLeft.
     */
    FauxScrollbar.prototype.setScrollLeft = function(num) {
        this._userActivatedScroll = true;
        this._scroller.scrollLeft = num;
    };

    /**
     * Used for testing.  Gets whether the scrollbar is showing.
     */
    FauxScrollbar.prototype.isShowing = function() {
        return this._scroller.scrollWidth > this._scroller.clientWidth;
    };

    return FauxScrollbar;
});
