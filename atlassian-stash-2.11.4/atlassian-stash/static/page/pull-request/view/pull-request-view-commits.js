define('page/pull-request/view/pull-request-view-commits', [
    'jquery',
    'model/page-state',
    'feature/pull-request/pull-request-commits'
], function (
    $,
    pageState,
    pullRequestCommitsFeature
) {
    return {
        load : function(el) {
            return pullRequestCommitsFeature.init({
                el : el,
                commitsTableWebSections : pageState.getPullRequestViewInternal().commitsTableWebSections,
                pullRequest : pageState.getPullRequest(),
                repository: pageState.getRepository()
            });
        },
        unload : function(el) {
            pullRequestCommitsFeature.reset();
            $(el).empty();
        },
        keyboardShortcutContexts : ['commits']
    };
});
