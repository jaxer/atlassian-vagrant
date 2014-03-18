define('page/maintenance/backup', [
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
            redirectUrl: hasToken ? navBuilder.admin().build() : navBuilder.allProjects().build(),
            canceledHeader: stash_i18n('stash.web.backup.canceled.title', 'Backup Canceled'),
            cancelingDescription: stash_i18n('stash.web.backup.canceling.description', 'Canceling backup.'),
            cancelDialogTitle: stash_i18n('stash.web.backup.dialog.title', 'Performing Backup'),
            cancelDialogDescription: stash_i18n('stash.web.backup.dialog.description', 'Are you sure you want to cancel the backup?'),
            cancelDialogButtonText: stash_i18n('stash.web.backup.dialog.cancel', 'Cancel backup')
        };

        maintenance.init(opts);
    };
});
