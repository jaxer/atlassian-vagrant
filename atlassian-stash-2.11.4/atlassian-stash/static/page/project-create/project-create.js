define('page/project-create', [
    'jquery',
    'feature/project/project-avatar-picker',
    'exports'
], function (
    $,
    ProjectAvatarPicker,
    exports
    ) {

    exports.onReady = function() {
        $("#key").generateFrom($("#name"), {
            maxNameLength: 64,
            maxKeyLength: 64
        });

        new ProjectAvatarPicker(".avatar-picker-field");
    };
});
