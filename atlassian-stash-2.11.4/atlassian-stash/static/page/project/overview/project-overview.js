define('page/project/overview', [
    'jquery',
    'util/flash-notifications',
    'feature/repository/repository-table',
    'exports'
], function(
    $,
    flashNotifications,
    RepositoryTable,
    exports) {

    exports.onReady = function(repositoryTableSelector) {
        // Attach flash notifications. Can be result of deleted repositories
        flashNotifications.attachNotifications('.project-banners', 'before');

        if ($(repositoryTableSelector).length) {
            new RepositoryTable(repositoryTableSelector, {
                showPublicStatus: true,
                bufferPixels: $('#footer').height() // Trigger next page buffering for the footer STASH-4024
            }).init();
        }
    };
});
