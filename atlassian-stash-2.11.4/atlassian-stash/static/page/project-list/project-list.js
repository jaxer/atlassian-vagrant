define('page/project-list', [
    'util/flash-notifications',
    'feature/project/project-table',
    'exports'
], function(
    flashNotifications,
    ProjectTable,
    exports) {

    'use strict';

    exports.onReady = function(projectTableId) {
        flashNotifications.attachNotifications('.project-banners', 'before');

        var table = new ProjectTable({
            target: '#' + projectTableId
        });
        table.init();
    };
});
