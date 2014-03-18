define('page/admin/usersList', [
    'util/flash-notifications',
    'widget/delete-dialog',
    'feature/user/user-table',
    'exports'
], function(
    flashNotifications,
    deleteDialog,
    UserTable,
    exports) {

    exports.onReady = function(tableSelector, deleteLinksSelector) {

        flashNotifications.attachNotifications('.content-body .notifications');

        var userTable = new UserTable({
            target : tableSelector
        });

        userTable.init();

        // confirm dialog to delete groups
        deleteDialog.bind(deleteLinksSelector,
            stash_i18n("stash.web.users.delete", "Delete user"),
            stash_i18n('stash.web.users.delete.success', 'The user {0} was successfully deleted.'),
            stash_i18n('stash.web.users.delete.fail', 'The user could not be deleted.'),
            function(displayName) {
                flashNotifications.addNotification(stash_i18n('stash.web.users.delete.success', 'The user {0} was successfully deleted.', displayName));
                location.reload();
            }
        );
    };
});