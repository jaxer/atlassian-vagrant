define('layout/project', [
    'model/page-state',
    'model/project'
], function (
    pageState,
    Project
) {
    return {
        onReady : function(projectJSON) {
            pageState.setProject(new Project(projectJSON));
        }
    };
});
