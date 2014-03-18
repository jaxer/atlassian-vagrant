define('page/admin/groupsList', [
    'util/flash-notifications',
    'widget/delete-dialog',
    'feature/user/group-table',
    'exports'
], function(
    flashNotifications,
    deleteDialog,
    GroupTable,
    exports) {

    exports.onReady = function(tableSelector, deleteLinksSelector) {

        flashNotifications.attachNotifications('.content-body .notifications');

        var groupTable = new GroupTable({
            target : tableSelector
        });

        groupTable.init();

        // confirm dialog to delete groups
        deleteDialog.bind(deleteLinksSelector,
            stash_i18n("stash.web.groups.delete", "Delete group"),
            stash_i18n('stash.web.groups.delete.success', 'The group {0} was successfully deleted.'),
            stash_i18n('stash.web.groups.delete.fail', 'The group could not be deleted.'),
            function(group) {
                flashNotifications.addNotification(stash_i18n('stash.web.groups.delete.success', 'The group {0} was successfully deleted.', group));
                location.reload();
            });
    };
});
