define('widget/exception', [
    'jquery',
    'exports'
], function(
    $,
    exports
    ) {

    'use strict';

    exports.onReady = function() {

        $(".formatted-throwable-toggle").click(function() {
            var $this = $(this);
            var $details = $this.next(".formatted-throwable");
            if ($this.data("message-visible")) {
                $details.hide('slow', function() {
                    $this.text(stash_i18n('stash.web.message.throwable.twixie.show', 'Show details'));
                });
                $this.data("message-visible", false);
            } else {
                $details.show('slow', function() {
                    $this.text(stash_i18n('stash.web.message.throwable.twixie.hide', 'Hide details'));
                });
                $this.data("message-visible", true);
            }
        });

    };
});
