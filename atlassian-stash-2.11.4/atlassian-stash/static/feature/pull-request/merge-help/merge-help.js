define('feature/pull-request/merge-help', [
    'aui',
    'util/events',
    'util/navbuilder'
], function (
    AJS,
    events,
    nav
) {

    var dialog;

    function createMergeHelpDialog(pullRequest, conflicted, vetoes) {
        var dialog = new AJS.Dialog({
            width:800,
            height:480,
            id:"merge-help-dialog",
            closeOnOutsideClick:true
        }).addHeader(stash_i18n("stash.web.pull-request.merge.help.header", "Issues Merging the Pull Request"));

        var sourceRepo = pullRequest.getFromRef().getRepository();
        var targetRepo = pullRequest.getToRef().getRepository();
        var sourceRemote = null;
        var targetRemote = null;

        if (!sourceRepo.isEqual(targetRepo)) {
            sourceRemote = nav.project(sourceRepo.getProject()).repo(sourceRepo).clone(sourceRepo.getScmId()).buildAbsolute();
            targetRemote = nav.project(targetRepo.getProject()).repo(targetRepo).clone(targetRepo.getScmId()).buildAbsolute();
        }

        dialog.addPanel('',
            stash.feature.pullRequest.mergeHelp({
                sourceBranch: pullRequest.getFromRef().getDisplayId(),
                targetBranch: pullRequest.getToRef().getDisplayId(),
                sourceRemote: sourceRemote,
                targetRemote: targetRemote,
                conflicted: conflicted,
                vetoes: vetoes
            }));
        dialog.addCancel(stash_i18n('stash.web.button.close', 'Close'), _.bind(dialog.hide, dialog));

        return dialog;
    }

    function showMergeHelpDialog() {
        if (dialog) {
            dialog.show();
            dialog.updateHeight();
        }
    }

    var cantMergeHandler = function(pullRequest, conflicted, vetoes) {
        if (dialog) {
            dialog.remove();
        }
        dialog = createMergeHelpDialog(pullRequest, conflicted, vetoes);
    };

    return {
        init : function() {
            events.on('stash.pull-request.cant.merge', cantMergeHandler);
            events.on('stash.pull-request.show.cant.merge.help', showMergeHelpDialog);

        },
        reset : function() {
            events.off('stash.pull-request.cant.merge', cantMergeHandler);
            events.off('stash.pull-request.show.cant.merge.help', showMergeHelpDialog);
            if (dialog) {
                dialog.remove();
                dialog = null;
            }
        }
    };
});
