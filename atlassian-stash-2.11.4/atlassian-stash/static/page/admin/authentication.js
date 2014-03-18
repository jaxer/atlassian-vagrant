define('page/admin/authentication', ['exports', 'jquery'], function(exports, $) {
    exports.onReady = function(publicSignUpButtonSelector, captchaOnSignButtonUpSelector) {
        var $captchaButton = $(captchaOnSignButtonUpSelector);
        var $signupButton = $(publicSignUpButtonSelector);

        var setCaptchaFromPublicSignup = function() {
            if ($signupButton.prop('checked')) {
                $captchaButton.prop('disabled', false);
            } else {
                $captchaButton.prop('disabled', true);
                $captchaButton.prop('checked', false);
            }
        };

        $signupButton.click(function () {
            setCaptchaFromPublicSignup();
        });

        setCaptchaFromPublicSignup();
    };
});