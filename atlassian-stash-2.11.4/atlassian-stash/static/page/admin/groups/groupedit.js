define('page/admin/groupEdit', [
    'jquery',
    'util/flash-notifications',
    'util/navbuilder',
    'widget/delete-dialog',
    'feature/user/group-users-table',
    'exports'
], function(
    $,
    flashNotifications,
    navBuilder,
    DeleteDialog,
    GroupUsersTable,
    exports) {

        exports.onReady = function (readOnly, groupUsersTableSelector, deleteLinkSelector) {

            // dialog to confirm the deletion of the group
            DeleteDialog.bind(deleteLinkSelector,
                stash_i18n('stash.web.groups.delete', 'Delete group'),
                stash_i18n('stash.web.groups.delete.success', 'The group {0} was successfully deleted.'),
                stash_i18n('stash.web.groups.delete.fail', 'The group could not be deleted.'),
                function(name) {
                    flashNotifications.addNotification(stash_i18n('stash.web.groups.delete.success', 'The group {0} was successfully deleted.', name));
                    window.location = navBuilder.admin().groups().build();
                    return false; // don't notify on view page, wait for page-pop
                }, function() {
                    return $('#group-name').text();
                });

            // list of users in the group
            var usersTable = new GroupUsersTable({
                target: groupUsersTableSelector
            });
            usersTable.init();
        };
});
