define('page/pull-request/pull-request-view', [
    'jquery',
    'model/page-state',
    'widget/unwatch-notification',
    'layout/pull-request',
    'exports'
], function (
    $,
    pageState,
    unwatchNotification,
    pullRequestLayout,
    exports
) {

    exports.registerHandler = pullRequestLayout.registerHandler;

    exports.onReady = function(unwatched) {
        if (unwatched) {
            var unwatchOptions = {
                dialogTitle: stash_i18n('stash.web.pullrequests.unwatched.header',
                    'Stopped watching pull request #{0}',
                    pageState.getPullRequest().getId()),
                dialogText: stash_i18n('stash.web.pullrequest.unwatched.content',
                    'Notifications for this pull request will no longer be sent to you.')
            };

            $(window).load(unwatchNotification.bind(null, unwatchOptions));
        }
    };
});
