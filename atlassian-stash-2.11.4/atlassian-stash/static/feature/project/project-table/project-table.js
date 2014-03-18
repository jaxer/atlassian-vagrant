define('feature/project/project-table', [
    'jquery',
    'util/navbuilder',
    'widget/paged-table'
], function (
    $,
    navbuilder,
    PagedTable
    ) {

    'use strict';

    function ProjectTable(options) {
        PagedTable.call(this, options);
    }

    $.extend(ProjectTable.prototype, PagedTable.prototype);

    ProjectTable.prototype.buildUrl = function (start, limit) {
        return navbuilder.allProjects()
            .withParams({
                start: start,
                limit: limit,
                avatarSize: stash.widget.avatarSizeInPx({ size: 'large' })
            }).build();
    };

    ProjectTable.prototype.handleNewRows = function (projectPage, attachmentMethod) {
        this.$table.find('tbody')[attachmentMethod](stash.feature.project.projectRows({
            projects: projectPage.values
        }));
    };

    return ProjectTable;
});
