define('feature/file-content/image-differ', [
    'jquery',
    'util/deprecation',
    'util/events'
], function (
    $,
    deprecate,
    events
) {

    /**
     * Create an ImageDiffer instance in the provided $container. This instance must eventually be `.init()`ed
     *
     * @param {jQuery|HTMLElement} $container where to place the differ.
     * @constructor
     */
    function ImageDiffer($container) {
        this._$container = $container;
    }

    /**
     * An enum of diffing modes - different ways to diff an image
     * @readonly
     * @enum {string}
     */
    ImageDiffer.modes = {
        /**
         * Display the images side by side for visual comparison
         */
        TWO_UP : 'two-up',
        /**
         * Blend the images together, using a slider to change the relative opacity of each image.
         */
        BLEND :  'blend',
        /**
         * Split the images vertically showing the old image on one side and the new image on the other.
         * Mouse position determines where the vertical split occurs.
         */
        SPLIT :  'split'
    };
    Object.freeze && Object.freeze(ImageDiffer.modes);

    /**
     * Initialize the instance. This expects two images to be found in the $container and assumes the first
     * is the "old" revision and the second is the "new" revision. This function will retrieve information about the
     * images like width and height.
     * @returns {Promise} promise that is resolved when the ImageDiffer is fully initialized.
     */
    ImageDiffer.prototype.init = function() {
        var self = this;

        var oldSize;
        var newSize;

        var $imgs = this._$imgs = this._$container.find('img');

        this._$sinceImg = $imgs.eq(0);
        this._$untilImg = $imgs.eq(1);

        this._$untilRevision = this._$untilImg.parent();
        this._$sinceRevision = this._$sinceImg.parent();
        this._$revisions = this._$untilRevision.add(this._$sinceRevision);

        this._$untilRevisionLabel = self._$untilRevision.find('h5');
        this._$sinceRevisionLabel = self._$sinceRevision.find('h5');

        self.setMode(ImageDiffer.modes.TWO_UP);

        var initialized = $.Deferred();

        $imgs.imagesLoaded().always(function() {

            var sincePromise = calculateImageNaturalSize(self._$sinceImg).done(function(size) { oldSize = size; });
            var untilPromise = calculateImageNaturalSize(self._$untilImg).done(function(size) { newSize = size; });

            $.when(sincePromise, untilPromise).done(function() {
                var sameDimensions = (oldSize.width === newSize.width) && (oldSize.height === newSize.height);

                var enableExtraModes = sameDimensions && oldSize.width > 0;

                initialized.resolve(enableExtraModes);
            }).fail(function() {
                initialized.reject();
            });
        });

        return initialized;
    };

    /**
     * destroy this instance and reclaim memory. It cannot be used after this.
     */
    ImageDiffer.prototype.destroy = function() {
        this._cleanOldMode(this._mode);
        this._mode = null;
    };

    /**
     * Set the mode to be used to diff these images.
     *
     * @param {ImageDiffer.modes} mode which diffing mode to use
     */
    ImageDiffer.prototype.setMode = function(mode) {
        if (this._mode !== mode) {
            this._onDiffModeChanged(mode, this._mode);
            this._mode = mode;
        }
    };




    // fdSlider triggers a change event in js when the polyfill is used.
    // something about how the event is fired means jQuery doesn't pick it up, so handlers attached through Query don't fire
    // I've added this function as a guard against memory leaks when assigning listeners natively.
    //
    // need event listeners for both change and input events because Firefox's implementation is correct that change is
    // fired only when the slider knob is released, but input is fired while the knob is being dragged around.
    // Webkit's fires both change and input while the knob is being dragged, but IE 10 and 11 don't fire the input event
    // at all. Ditto with the polyfill for IE9, so we still need an event listener for change
    // more details here: https://bugzilla.mozilla.org/show_bug.cgi?id=853670
    function addChangeListener(el, fn) {
        el.onchange = fn;
        el.oninput = fn;
    }

    function removeChangeListeners(el) {
        el.onchange = null;
        el.oninput = null;
    }

    function calculateImageNaturalSize($image) {

        if ($image.data('natural-size')) {
            return $.Deferred().resolve($image.data('natural-size'));
        }

        // user the naturalWidth and naturalHeight properties if the browser supports it
        if ($image[0].naturalWidth) {
            var size = {width: $image[0].naturalWidth, height: $image[0].naturalHeight};
            $image.data('natural-size', size);
            return $.Deferred().resolve(size);
        }

        // otherwise create an image object in memory, wait till it's loaded and get its dimensions (IE8)
        var newImg = new Image(),
            promise = $.Deferred(),
            returned = false,
            onComplete = function() {
                if (!returned) {
                    var size = {width: newImg.width, height: newImg.height};
                    $image.data('natural-size', size);
                    promise.resolve(size);
                    returned = true;
                }
            };

        newImg.onload = onComplete;
        newImg.src = $image[0].src;
        if (newImg.complete) {
            onComplete();
        }
        return promise;
    }

    ImageDiffer.prototype._cleanOldMode = function(oldMode) {
        switch(oldMode) {
            case ImageDiffer.modes.TWO_UP:
                this._cleanTwoUpDiff();
                break;
            case ImageDiffer.modes.BLEND:
                this._cleanBlendDiff();
                break;
            case ImageDiffer.modes.SPLIT:
                this._cleanSplitDiff();
                break;
        }
    };

    ImageDiffer.prototype._onDiffModeChanged = function(newMode, oldMode) {

        this._$container.removeClass('two-up blend split').addClass(newMode);

        this._cleanOldMode(oldMode);

        switch (newMode) {
            case ImageDiffer.modes.TWO_UP:
                this._setupTwoUpDiff();
                break;
            case ImageDiffer.modes.BLEND:
                this._setupBlendDiff();
                break;
            case ImageDiffer.modes.SPLIT:
                this._setupSplitDiff();
                break;
        }

        deprecate.triggerDeprecated('stash.feature.fileContent.diffView.imageDiffModeChanged', this, newMode, oldMode, 'stash.feature.fileContent.imageDiffer.modeChanged', '2.10', '3.0');
        events.trigger('stash.feature.fileContent.imageDiffer.modeChanged', null, newMode, oldMode);
    };

    ImageDiffer.prototype._cleanTwoUpDiff = $.noop;
    ImageDiffer.prototype._setupTwoUpDiff = $.noop;

    ImageDiffer.prototype._cleanBlendDiff = function() {
        var $opacitySliderContainer = this._$container.children('.opacity-slider-container');
        var $opacitySlider = $opacitySliderContainer.find('input');

        $opacitySliderContainer.remove();
        this._$untilImg.css('opacity', '');

        removeChangeListeners($opacitySlider[0]);
    };

    ImageDiffer.prototype._setupBlendDiff = function() {
        var self = this;

        // add in the slider
        var $opacitySlider = $('<input type="range" min="0" max="1" step="0.01" value="1" />');

        this._$container.children('.image-diff-toolbar').after(
            $('<div class="opacity-slider-container" />').append($opacitySlider)
        );

        fdSlider.onDomReady();

        // set opacity when the slider changes
        addChangeListener($opacitySlider[0], function () {
            self._$untilImg.css('opacity', parseFloat($(this).val()));
        });
    };

    ImageDiffer.prototype._cleanSplitDiff = function() {

        this._$imgs.css('width', '').css('height', '');
        this._$revisions.css('width', '');
        this._$untilRevision.css('margin-left', '');
        this._$untilRevisionLabel.add(this._$sinceRevisionLabel).css('margin-left', '').css('margin-right', '');

        this._$untilImg.unwrap();
        this._$untilRevisionImageContainer.remove(); // cleanup events
        delete this._$untilRevisionImageContainer;

        this._$revisions.unwrap();
        this._$splitContainer.remove(); // cleanup events
        delete this._$splitContainer;

        if (this._onResize) {
            events.off('window.resize.debounced', this._onResize);
            delete this._onResize;
        }
    };

    function getMaxWidthToFit($el, parentWidth) {
        var marginBorderPadding = $el.data('margin_border_padding');
        if (marginBorderPadding == null) {
            marginBorderPadding = $el.outerWidth(true) - $el.width();
            $el.data('margin_border_padding', marginBorderPadding);
        }

        return parentWidth - marginBorderPadding;
    }

    ImageDiffer.prototype._setSplitDiffElementProperties = function($untilRevisionImageContainer, $splitContainer, naturalImageSize) {

        // determine the chain of element widths that will allow us to fit our imgs within the content frame:
            // max width of .binary-container
        var maxBinaryContainerWidth = getMaxWidthToFit(this._$container, this._$container.parent().width());
            // max width of .split-container
        var maxSplitContainerWidth = getMaxWidthToFit($splitContainer, maxBinaryContainerWidth);
            // max width of each .binary
        var maxRevisionWidth = getMaxWidthToFit(this._$sinceRevision, maxSplitContainerWidth);
            // max width of each image
        var maxImgWidth = getMaxWidthToFit(this._$sinceImg, maxRevisionWidth);

        // set the imgs to their natural width explicitly, or else to the max width if they won't fit.
        var imageWidth = Math.min(naturalImageSize.width, maxImgWidth);
        this._$imgs.width(imageWidth);
        // set a proportional height
        this._$imgs.height(Math.floor((imageWidth / naturalImageSize.width) * naturalImageSize.height));

        // set the image container height to perfectly fit the images (they have a border, so we can't just use the same value).
        $untilRevisionImageContainer.height(this._$imgs.outerHeight(true));


        // now that we have the width of the images, work back up so we can set an explicit width on .binary
        var revisionWidth = imageWidth + (maxRevisionWidth - maxImgWidth);
        this._$revisions.width(revisionWidth);
        // shift the entire .until-revision container to the left by the same distance as the width of the image, so that the two .binary containers overlap
        this._$untilRevision.css('margin-left', -revisionWidth);
    };

    ImageDiffer.prototype._setupSplitDiff = function() {
        var self = this;

        return calculateImageNaturalSize(this._$imgs).done(function(naturalImageSize) {

            self._$untilImg.wrap('<div class="image-container" />');
            self._$revisions.wrapAll('<div class="split-container" />');

            self._$untilRevisionImageContainer = self._$untilImg.parent();
            self._$splitContainer = self._$container.find('.split-container');


            var maxImageContainerWidth;
            self._onResize = function() {
                self._setSplitDiffElementProperties(self._$untilRevisionImageContainer, self._$splitContainer, naturalImageSize);

                maxImageContainerWidth = self._$sinceImg.outerWidth(true);
            };
            self._onResize();
            events.on('window.resize.debounced', self._onResize);

            if(naturalImageSize.width < 50) {
                // If the image width is < 50px, that offset based on image width is not going to be sufficient to prevent overlap, so fix it at -50px
                self._$untilRevisionLabel.css('margin-left', '-50px');
                self._$sinceRevisionLabel.css('margin-right', '-50px');
            } else if(naturalImageSize.width < 100) {
                // If the image width is < 100px, offset the since and until (old/new) labels by the same px distance using negative margins so they sit outside of the .binary container
                self._$untilRevisionLabel.css('margin-left', -naturalImageSize.width);
                self._$sinceRevisionLabel.css('margin-right', -naturalImageSize.width);
            }

            var offset;
            self._$splitContainer.on('mouseenter', function() {
                offset = self._$untilRevision.offset();
                self._$revisions.on('mousemove', onMove);
            });

            self._$splitContainer.on('mouseleave', function() {
                self._$revisions.off('mousemove', onMove);
            });

            var onMove = function(e)  {
                self._$untilRevisionImageContainer.css('width', Math.min(e.pageX - offset.left, maxImageContainerWidth));
            };
        });
    };

    return ImageDiffer;
});

