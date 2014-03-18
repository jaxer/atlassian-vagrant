define('page/pull-request/view/pull-request-view-diff', [
    'jquery',
    'model/page-state',
    'feature/pull-request/pull-request-diff'
], function (
    $,
    pageState,
    pullRequestDiffFeature
) {
    return {
        load : function(el) {
            el.innerHTML = stash.feature.pullRequest.diff({
                diffTreeHeaderWebItems : pageState.getPullRequestViewInternal().diffTreeHeaderWebItems
            });
            pullRequestDiffFeature.init(
                pageState.getPullRequest(),
                pageState.getPullRequestViewInternal().maxChanges,
                pageState.getPullRequestViewInternal().relevantContextLines
            );
        },
        unload : function(el) {
            return pullRequestDiffFeature.reset().done(function(){
                //Don't empty the el until the promise is done to avoid blowing away any data needed for cleanup
                $(el).empty();
            });
        },
        keyboardShortcutContexts : ['diff-tree', 'diff-view']
    };
});
