define('page/repository-create', [
    'model/page-state',
    'model/project',
    'feature/repository/cloneUrlGen',
    'exports'
], function(
    pageState,
    Project,
    cloneUrlGen,
    exports
) {
    exports.onReady = function(projectJSON) {
        pageState.setProject(new Project(projectJSON));
        cloneUrlGen.bindUrlGeneration("#name", "#name + .description .clone-url > span");
    };
});
