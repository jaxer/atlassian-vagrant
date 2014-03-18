define('page/maintenance/migration', [
    'util/navbuilder',
    'layout/maintenance',
    'exports'
], function(
    navBuilder,
    maintenance,
    exports
) {
        exports.onReady = function(hasToken) {

            var opts = {
                redirectUrl: hasToken ? navBuilder.admin().db().build() : navBuilder.allProjects().build(),
                canceledHeader: stash_i18n('stash.web.migration.canceled.title', 'Migration Canceled'),
                cancelingDescription: stash_i18n('stash.web.migration.canceling.description', 'Canceling database migration and rolling back to original database.'),
                cancelDialogTitle: stash_i18n('stash.web.migration.dialog.title', 'Database Migration'),
                cancelDialogDescription: stash_i18n('stash.web.migration.dialog.description', 'Are you sure you want to cancel the migration? Canceling the migration will make Stash rollback to the previous database and leave the target database in an inconsistent state.'),
                cancelDialogButtonText: stash_i18n('stash.web.migration.dialog.cancel', 'Cancel migration')
            };

            maintenance.init(opts);
        };
});
