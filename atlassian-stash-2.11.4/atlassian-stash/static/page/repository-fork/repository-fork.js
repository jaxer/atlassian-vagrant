define('page/repository-fork', [
    'jquery',
    'model/repository',
    'model/page-state',
    'feature/project/project-selector',
    'feature/repository/cloneUrlGen',
    'exports'
], function ($, Repository, pageState, ProjectSelector, cloneUrlGen, exports) {

    function initRepositoryPageState(repositoryJson) {
        var repo = new Repository(repositoryJson);
        pageState.setRepository(repo);
        pageState.setProject(repo.getProject());
    }

    function initProjectSelector(projectSelectorSelector, personalProjectJson) {
        var $projectTrigger = $(projectSelectorSelector);
        var $projectInput = $projectTrigger.next('input');
        return new ProjectSelector($projectTrigger, {
            field: $projectInput,
            preloadData: ProjectSelector.constructDataPageFromPreloadArray([personalProjectJson])
        });
    }

    exports.onReady = function (repositoryJson, personalProjectJson, projectSelectorSelector) {
        initRepositoryPageState(repositoryJson);
        var projectSelector = initProjectSelector(projectSelectorSelector, personalProjectJson);

        cloneUrlGen.bindUrlGeneration("#name", "#name + .description .clone-url > span", function () {
            return projectSelector.getSelectedItem();
        });
    };
});
