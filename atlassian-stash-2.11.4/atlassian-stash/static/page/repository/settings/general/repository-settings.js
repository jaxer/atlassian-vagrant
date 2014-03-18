define('page/repositoryGeneralSettings', [
    'jquery',
    'aui',
    'util/ajax',
    'util/navbuilder',
    'util/error',
    'util/flash-notifications',
    'model/page-state',
    'widget/confirm-dialog',
    'feature/project/project-selector',
    'feature/repository/branch-selector',
    'feature/repository/cloneUrlGen',
    'exports'
], function(
    $,
    AJS,
    ajax,
    nav,
    errorUtil,
    flashNotifications,
    pageState,
    ConfirmDialog,
    ProjectSelector,
    BranchSelector,
    cloneUrlGen,
    exports) {

    function createMoveDialog() {
        var moveDialog = new AJS.Dialog({
            id: 'repository-move-dialog'
        });

        var dialogContent = stash.page.moveRepositoryForm({
            repository : pageState.getRepository().toJSON()
        });

        moveDialog.addHeader(stash_i18n('stash.web.repository.move.title', 'Move repository'));
        moveDialog.addPanel('', dialogContent);

        // bind project selector
        var $projectSelectorTrigger = $('#moveProjectSelector');
        var projectSelector = new ProjectSelector($projectSelectorTrigger, {
            field : $projectSelectorTrigger.next('input')
        });

        // bind cloneUrlGen
        cloneUrlGen.bindUrlGeneration("#moveName", "#moveName + .description .clone-url > span", function() {
            return projectSelector.getSelectedItem();
        });

        function moveRepository() {
            var moveName = $('#moveName').val();
            var moveProject = projectSelector.getSelectedItem().toJSON();

            if (moveName === pageState.getRepository().getName() && moveProject.key === pageState.getProject().getKey()) {
                // nothing to save. just close the dialog
                moveDialog.hide();
                return;
            }

            ajax.rest({
                type: 'PUT',
                url: nav.rest().currentRepo().build(),
                data: {
                    name : moveName,
                    project : moveProject
                },
                statusCode: {
                    // Don't handle these globally. We will want to show
                    // an error message in the form
                    '400' : false,
                    '409' : false
                }
            })
                .done(function(repository) {
                    flashNotifications.addNotification(
                        // It is possible to rename the repository only in the move dialog.
                        repository.project.key === pageState.getProject().getKey() ?
                            stash_i18n('stash.web.repository.rename.success', '{0} successfully renamed to {1}', pageState.getRepository().getName(), repository.name) :
                            stash_i18n('stash.web.repository.move.success', '{0} successfully moved into {1}', repository.name, repository.project.name)
                    );
                    location.href = nav.project(repository.project.key).repo(repository.slug).settings().build();
                })
                .fail(function(xhr, testStatus, errorThrown, data) {
                    errorUtil.setFormErrors(
                        moveDialog.popup.element.find('form.aui'),
                        // The move dialog uses different field names to prevent duplicate ids.
                        // transform relevant contexts to something errorUtil will understand
                        _.chain(data.errors)
                            .filter(function(error) {
                                return error.context !== 'slug';
                            })
                            .map(function(error) {
                                var context = error.context;
                                if (context === 'project' || context === 'name') {
                                    error.context = 'move' + context.charAt(0).toUpperCase() + context.slice(1);
                                }
                                return error;
                            })
                            .value()
                    );
                    moveDialog.updateHeight();
                });

        }

        moveDialog.addButton(stash_i18n('stash.web.button.move', 'Move'), moveRepository, 'button');
        moveDialog.popup.element.find('form.aui').on('submit', function(e) {
            e.preventDefault();
            moveRepository();
        });

        moveDialog.addCancel(stash_i18n('stash.web.button.cancel', 'Cancel'), function () {
            projectSelector.dialog.hide();
            moveDialog.hide();
        });
        return moveDialog;
    }

    function initMoveButton(moveButtonSelector) {
        var dialog;
        $(moveButtonSelector).on('click', function(e) {
            e.preventDefault();
            if (!dialog) {
                dialog = createMoveDialog();
            }
            dialog.show();
            errorUtil.clearFormErrors(dialog.popup.element);
            dialog.updateHeight();
        });
    }

    function initDeleteButton(deleteButtonSelector) {
        var repo = pageState.getRepository();

        var $panelContent =
            $("<p>").html(stash_i18n("stash.web.repository.delete.confirm", "Are you sure you want to delete {0}?", "<b>" + AJS.escapeHtml(repo.getName()) + "</b>"));
        var $panelContentDetail =
            $("<p>").html(stash_i18n("stash.web.repository.delete.confirm.detail", "This cannot be undone. All of the repository''s contents will be irretrievably lost if they are not also stored elsewhere. All pull requests to this repository will also be deleted."));

        $.merge($panelContent, $panelContentDetail);

        var deleteRepositoryDialog = new ConfirmDialog({
            id : "delete-repository-dialog",
            titleText: stash_i18n('stash.web.repository.delete.title', 'Delete repository'),
            titleClass : 'warning-header',
            panelContent : $panelContent,
            submitText : stash_i18n('stash.web.button.delete', 'Delete'),
            height: 240
        }, { type: 'DELETE' });

        deleteRepositoryDialog.attachTo(deleteButtonSelector);

        deleteRepositoryDialog.addConfirmListener(function(promise) {
            promise.then(function(data, status, xhr) {
                return ajax.poll({
                    url: $(deleteButtonSelector).attr('href'),
                    statusCode: {
                        '404': function() {
                            flashNotifications.addNotification(stash_i18n('stash.web.repository.deleted', 'The repository {0} has been deleted.', repo.getName()));

                            window.location = nav.currentProject().build();

                            return false; // don't handle this globally.
                        }
                    }
                });
            });
        });
    }


    exports.onReady = function(formSelector, moveButtonSelector, deleteButtonSelector) {
        // Ensure that any flash notifications which are available are added to the page
        flashNotifications.attachNotifications(formSelector, 'before');

        initMoveButton(moveButtonSelector);
        initDeleteButton(deleteButtonSelector);
        var branchSelector = new BranchSelector($("#default-branch"), {field: $("#default-branch-field")});
        cloneUrlGen.bindUrlGeneration("#name", "#name + .description .clone-url > span");
    };
});
