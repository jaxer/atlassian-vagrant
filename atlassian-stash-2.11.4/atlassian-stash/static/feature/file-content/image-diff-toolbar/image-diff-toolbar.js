define('feature/file-content/image-diff-toolbar', [
    'jquery',
    'util/events'
], function(
    $,
    events
) {

    'use strict';

    /**
     * A toolbar containing controls for diffing two image files.
     *
     * When the constructor is called, the toolbar will be added to the $container in an initial, partially disabled state
     * where only the two-up mode is available.
     * `.init()` must eventually also be called on the toolbar.
     *
     * @param {jQuery|HTMLElement} $toolbar the toolbar generated from calling Soy template stash.feature.fileContent.imageDiffToolbar.main
     * @constructor ImageDiffToolbar
     */
    function ImageDiffToolbar($container) {
        this._$toolbar = $(stash.feature.fileContent.imageDiffToolbar.main());
        this._$toggle = this._$toolbar.find('.image-diff-toggle');
        $container.append(this._$toolbar);
    }
    $.extend(ImageDiffToolbar.prototype, events.createEventMixin("image-diff-toolbar", { localOnly : true }));

    /**
     * Initialize the toolbar and enable all diffing modes, if appropriate.
     *
     * @param enableExtraModes whether to enable extra diffing modes, or just two-up.
     */
    ImageDiffToolbar.prototype.init = function (enableExtraModes) {
        var self = this;

        var $diffTwoUpModeButton = this._$toggle.find('.image-diff-two-up');
        var $diffBlendModeButton = this._$toggle.find('.image-diff-blend');
        var $diffSplitModeButton = this._$toggle.find('.image-diff-split');

        // enable the split and blend buttons if we're supporting that mode.
        $diffSplitModeButton.attr('aria-disabled', !enableExtraModes);
        if (enableExtraModes) {
            $diffSplitModeButton.attr('title', stash_i18n('stash.web.sourceview.button.diff.image.split.tooltip', 'Compare the image changes by moving your mouse cursor left or right over the image'));
        }

        $diffBlendModeButton.attr('aria-disabled', !enableExtraModes);
        if (enableExtraModes) {
            $diffBlendModeButton.attr('title', stash_i18n('stash.web.sourceview.button.diff.image.blend.tooltip', 'Compare the image changes by fading in the differences'));
        }

        function changeMode(newMode) {
            self.trigger('modeChanged', newMode, self._mode);
            self._mode = newMode;
        }

        var $modeListButtons = this._$toggle.find('.aui-button');

        var makeButtonClick = function(newMode) {
            return function(e) {
                var $this = $(this);
                if ($this.attr('aria-disabled')!=='true' && $this.attr('aria-pressed')!=='true') {
                    $modeListButtons.attr('aria-pressed', 'false');
                    $this.attr('aria-pressed', 'true');

                    changeMode(newMode);
                }
                e.preventDefault();
            };
        };
        $diffTwoUpModeButton.click(makeButtonClick('two-up'));
        $diffBlendModeButton.click(makeButtonClick('blend'));
        $diffSplitModeButton.click(makeButtonClick('split'));

        $diffTwoUpModeButton.add($diffBlendModeButton).add($diffSplitModeButton)
            .tooltip({
                gravity: 's'
            });

        changeMode('two-up');
    };

    /**
     * Can be called to retrieve the currently selected diffing mode represented by the toolbar at any time.
     * These modes are defined in ImageDiffer.modes in image-differ.js
     *
     * @returns {string} the currently selected diffing mode
     */
    ImageDiffToolbar.prototype.getMode = function () {
        return this._mode;
    };

    /**
     * destroy this toolbar instance and remove it from the DOM. Once destroyed, it cannot be reused.
     */
    ImageDiffToolbar.prototype.destroy = function () {
        if (this._$toolbar) {
            this._$toolbar.remove();
            this._$toolbar = null;
        }
        this._$toggle = null;
    };
    
    return ImageDiffToolbar;
    
});
