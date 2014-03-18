define('page/repository/hooks', [
    'exports',
    'jquery',
    'aui',
    'model/repository-hook',
    'feature/repository/hook-list'
],
function(
    exports,
    $,
    AJS,
    RepositoryHook,
    HookListView
    ) {



    exports.onReady = function(preReceiveHookPage, postReceiveHookPage) {
        var preReceiveHookList = new HookListView({
            el : $('#pre-receive-hook-table')[0],
            hookType : 'PRE_RECEIVE',
            collection: new RepositoryHook.Collection(preReceiveHookPage.values)
        });

        var postReceiveHookList = new HookListView({
            el : $('#post-receive-hook-table')[0],
            hookType : 'POST_RECEIVE',
            collection: new RepositoryHook.Collection(postReceiveHookPage.values)
        });

        var inlineDialog = AJS.InlineDialog($(".add-hook-button"), 1,
            function(content, trigger, showPopup) {
                content.html(stash.feature.repository.hookAddDialog());
                content.find(".cancel").click(function(e) {
                    e.preventDefault();
                    inlineDialog.hide();
                });
                showPopup();
            });
    };

});