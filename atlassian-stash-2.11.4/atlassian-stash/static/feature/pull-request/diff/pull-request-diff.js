define('feature/pull-request/pull-request-diff', [
    'jquery',
    'aui',
    'model/commit-range',
    'util/events',
    'layout/page-scrolling-manager',
    'feature/changeset/tree-and-diff-view',
    'feature/pull-request/pull-request-history',
    'exports'
], function(
    $,
    AJS,
    CommitRange,
    events,
    pageScrollingManager,
    treeAndDiffView,
    pullRequestHistory,
    exports
) {

    function bindAddFileCommentHandler(keys) {
        (this.execute ? this : AJS.whenIType(keys)).execute(function() {
            $('.add-file-comment-trigger:first').click();
        });
    }


    var stopAccepting;
    exports.init = function(pullRequest, maxChanges, relevantContextLines) {

        events.on('stash.keyboard.shortcuts.pullrequest.addCommentHandler', bindAddFileCommentHandler);
        stopAccepting = pageScrollingManager.acceptScrollForwardingRequests();

        treeAndDiffView.init(new CommitRange({ pullRequest : pullRequest }), {
            commentMode : treeAndDiffView.commentMode.CREATE_NEW,
            maxChanges : maxChanges,
            relevantContextLines : relevantContextLines,
            toolbarWebFragmentLocationPrimary : 'stash.pull-request.diff.toolbar.primary',
            toolbarWebFragmentLocationSecondary : 'stash.pull-request.diff.toolbar.secondary'
        });
        pullRequestHistory.init();
    };
    exports.reset = function() {
        events.off('stash.keyboard.shortcuts.pullrequest.addCommentHandler', bindAddFileCommentHandler);
        pullRequestHistory.reset();
        var resetDone = treeAndDiffView.reset();
        stopAccepting();
        return resetDone;
    };
});