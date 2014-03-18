define('page/admin/mailServer', [
    'jquery',
    'util/flash-notifications',
    'widget/confirm-dialog',
    'exports'
], function(
    $,
    flashNotifications,
    ConfirmDialog,
    exports) {

    exports.onReady = function(deleteButtonSelector, testButtonSelector, testAddressSelector) {

        flashNotifications.attachNotifications($('.stash-mailserver-form'), 'before');

        // bind the 'Test' button to send a test email with the current config
        var $testButton = $(testButtonSelector);
        $testButton.click(function() {
            var $this = $(this),
                $spinner = $("<div class='spinner'></div>");

            $this.nextAll().remove();
            $this.after($spinner);
            $spinner.spin();
        });

        $(testAddressSelector).keypress(function(event) {
            // so that it doesn't use the Save submit button
            if (event.which === 13) {
                event.preventDefault();
                $testButton.click();
            }
        });

        // bind the delete button
        var panelContent = stash.widget.paragraph({
            text: stash_i18n('stash.web.mailserver.delete.confirm', 'Are you sure that you want to remove the mail server configuration?')
        });

        var confirmDialog = new ConfirmDialog({
            id:"delete-mail-sever-config-dialog",
            titleText: stash_i18n('stash.web.mailserver.delete.config', 'Delete the mail server configuration'),
            titleClass: 'warning-header',
            panelContent: panelContent,
            submitText: stash_i18n('stash.web.button.delete', 'Delete')
        }, { type: 'DELETE' });

        confirmDialog.attachTo(deleteButtonSelector);

        confirmDialog.addConfirmListener(function (promise) {
            promise.done(function (data) {
                flashNotifications.addNotification(
                    stash_i18n('stash.web.config.mail.deleted', 'The mail server configuration was deleted'),
                    'info'
                );
                window.location.reload();
            });
        });

    };
});