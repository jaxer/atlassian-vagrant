define('page/admin/globalPermissions', [
    'util/navbuilder',
    'feature/permission/permission-table',
    'exports'
], function(
    nav,
    permissionTable,
    exports) {

    exports.onReady = function(permissions, currentUserHighestPerm) {
        permissionTable.initialise(
            nav.admin().permissions(),
            permissions,
            currentUserHighestPerm
        );
    };

});
