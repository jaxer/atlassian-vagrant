define('widget/unwatch-notification', [
    'aui',
    'jquery'
], function(
    AJS,
    $
) {

    'use strict';

    /**
     * Display a dialog notifying the user that they have unwatched an entity.
     * Usually called on $(window).load
     *
     * @param {Object} options - Dialog options
     * @param {string} options.dialogId - ID for the dialog
     * @param {string} options.dialogTitle - Text shown in the title of the dialog
     * @param {string} options.dialogText - Text shown in the body of the dialog
     * @param {string} options.dialogCancelText - The text of the cancel link
     */
    return function unwatchNotification(options) {
        options = $.extend({
            dialogId: 'unwatch-msg-dialog',
            dialogTitle: stash_i18n('stash.web.watchable.unwatched.header', 'Stopped watching'),
            dialogText: stash_i18n('stash.web.watchable.unwatched.content',
                'Notifications will no longer be sent to you.'),
            dialogCancelText: stash_i18n('stash.web.button.done', 'Done')
        }, options);

        var dialog = new AJS.Dialog({
            width: 450,
            height: 200,
            id: options.dialogId,
            closeOnOutsideClick: false,
            keypressListener: function (e) {
                e.stopImmediatePropagation();
                if (e.keyCode === $.ui.keyCode.ENTER || e.keyCode === $.ui.keyCode.ESCAPE) {
                    dialog.remove();
                }
            }
        });

        dialog.addHeader(options.dialogTitle);
        dialog.addPanel('content', stash.widget.paragraph({text: options.dialogText}));
        dialog.addCancel(options.dialogCancelText, function (dialog) {
            dialog.remove();
        });

        dialog.show();
    };
});
