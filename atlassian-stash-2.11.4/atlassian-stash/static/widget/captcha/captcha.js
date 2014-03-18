define('widget/captcha', [
    'jquery',
    'util/navbuilder',
    'exports'
], function(
    $,
    navbuilder,
    exports) {

    'use strict';

    exports.initialise = function(captchaImageSelector, refreshAnchorSelector) {
        var $captchaImage = $(captchaImageSelector);

        $(refreshAnchorSelector).click(function(e) {
            $captchaImage.attr('src', navbuilder.captcha().build());
            return false;
        });
    };
});