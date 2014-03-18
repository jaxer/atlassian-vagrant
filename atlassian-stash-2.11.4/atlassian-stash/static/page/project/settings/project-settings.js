define('page/project/settings', [
    'aui',
    'jquery',
    'model/page-state',
    'util/ajax',
    'util/flash-notifications',
    'util/navbuilder',
    'widget/confirm-dialog',
    'feature/project/project-avatar-picker',
    'exports'
], function(
    AJS,
    $,
    pageState,
    ajax,
    flashNotifications,
    nav,
    ConfirmDialog,
    ProjectAvatarPicker,
    exports) {

    exports.initDeleteButton = function (deleteButtonSelector) {

        var $panelContent = $("<div class='container'></div>"), // css class used for func test
            $spinner;

        var confirmDialog = new ConfirmDialog({
            id: "delete-project-dialog",
            titleText: stash_i18n("stash.web.project.delete", "Delete project"),
            titleClass: 'warning-header',
            confirmButtonClass: 'delete-confirm-button',
            panelContent: $panelContent,
            submitText: stash_i18n('stash.web.button.delete', 'Delete')
        }, { type: 'DELETE' });

        function initContent() {
            $panelContent.empty();
            $spinner = $("<div class='spinner'></div>").appendTo($panelContent);
        }

        function setDeleteButtonEnabled(enabled) {
            if (enabled) {
                $(".delete-confirm-button").removeProp("disabled").removeClass("disabled");
            } else {
                $(".delete-confirm-button").prop("disabled", "disabled").addClass("disabled");
            }
        }

        function okToDeleteProject() {
            var $content =
                $("<p>").html(stash_i18n("stash.web.project.delete.confirm", "Are you sure that you want to delete {0}?", "<b>" + AJS.escapeHtml(pageState.getProject().getName()) + "</b>"));
            var $contentDetail =
                $("<p>").html(stash_i18n("stash.web.project.delete.confirm.detail", "Deleting cannot be undone and this project will be permanently removed."));

            $.merge($content, $contentDetail);
            $panelContent.append($content);
            setDeleteButtonEnabled(true);
        }

        function cannotDeleteProject() {
            var $content =
                $("<p>").html(stash_i18n("stash.web.project.delete.unable", "The project {0} cannot be deleted.", "<b>" + AJS.escapeHtml(pageState.getProject().getName()) + "</b>"));
            var $contentDetail =
                $("<p>").html(stash_i18n("stash.web.project.delete.unable.detail", "All repositories must be removed from this project before it can be deleted."));

            $.merge($content, $contentDetail);
            $panelContent.append($content);
            setDeleteButtonEnabled(false);
        }

        confirmDialog.attachTo(deleteButtonSelector, function () {
            initContent();
            setDeleteButtonEnabled(false);
            $spinner.spin('large');
            ajax.rest({
                url: nav.rest().currentProject().allRepos().build(),
                statusCode : {
                    '*' : function() {
                        return false; // don't show any error messages.
                    }
                }
            }).done(function (data) {
                if (data && data.size) {
                    cannotDeleteProject();
                } else {
                    okToDeleteProject();
                }
            }).fail(function () {
                okToDeleteProject();
            }).always(function () {
                $spinner.spinStop().remove();
            });
        });

        confirmDialog.addConfirmListener(function (promise) {
            promise.done(function (data) {
                flashNotifications.addNotification(stash_i18n('stash.web.project.deleted', 'The project {0} has been deleted.', pageState.getProject().getName()));

                window.location = nav.allProjects().build();
            });
        });


    };

    exports.onReady = function(){
        new ProjectAvatarPicker(".avatar-picker-field");
    };
});
