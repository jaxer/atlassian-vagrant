define('page/users/profile', [
    'jquery',
    'util/flash-notifications',
    'feature/repository/repository-table',
    'exports'
], function (
    $,
    flashNotifications,
    RepositoryTable,
    exports
) {

    exports.onReady = function(repositoryTableSelector, personalProjectKey, isOwnProfile, userDisplayName) {
        // Attach flash notifications. Can be result of deleted repositories
        flashNotifications.attachNotifications(repositoryTableSelector, 'before');

        new RepositoryTable(repositoryTableSelector, {
            projectKey: personalProjectKey,
            showPublicStatus: true,
            noneFoundMessageHtml: isOwnProfile ?
                stash.users.profile.noRepositoriesSelf({projectKey: personalProjectKey}) :
                stash.users.profile.noRepositories({userDisplayName: userDisplayName}),
            bufferPixels: $('#footer').height()
        }).init();
    };
});
