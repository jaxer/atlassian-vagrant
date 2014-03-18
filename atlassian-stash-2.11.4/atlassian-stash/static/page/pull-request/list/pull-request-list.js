define('page/pull-requests-list', [
    'model/page-state',
    'util/events',
    'util/navbuilder',
    'feature/pull-request/pull-request-table',
    'widget/avatar-list',
    'exports'
], function (
    pageState,
    events,
    navBuilder,
    PullRequestsTable,
    AvatarList,
    exports
) {
    'use strict';
    var pullRequestTable;

    function getPullRequestsUrlBuilder(state) {
        return navBuilder.rest().currentRepo().allPullRequests().withParams({ state: state });
    }

    function bindKeyboardShortcuts() {
        pullRequestTable.initShortcuts();

        events.on('stash.widget.keyboard-shortcuts.register-contexts', function (keyboardShortcuts) {
            keyboardShortcuts.enableContext('pull-request-list');
        });

        events.on('stash.keyboard.shortcuts.requestMoveToNextHandler', pullRequestTable.bindMoveToNextHandler);
        events.on('stash.keyboard.shortcuts.requestMoveToPreviousHandler', pullRequestTable.bindMoveToPreviousHandler);
        events.on('stash.keyboard.shortcuts.requestOpenItemHandler', pullRequestTable.bindOpenItemHandler);
        events.on('stash.keyboard.shortcuts.pullrequest.requestHighlightAssignedHandler', pullRequestTable.bindHighlightAssignedHandler);
    }

    exports.onReady = function (state, order) {
        pullRequestTable = new PullRequestsTable(state, order, getPullRequestsUrlBuilder, {
            noneFoundMessageHtml: stash.feature.pullRequest.pullRequestIntro({ repository: pageState.getRepository().toJSON(),
                state: state
            })
        });
        pullRequestTable.init();
        AvatarList.init();

        bindKeyboardShortcuts();
    };
});
