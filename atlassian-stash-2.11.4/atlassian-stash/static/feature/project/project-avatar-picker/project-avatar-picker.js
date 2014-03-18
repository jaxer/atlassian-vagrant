define('feature/project/project-avatar-picker', [
    'jquery',
    'widget/avatar-picker-dialog'
], function (
    $,
    AvatarPickerDialog
) {
    function ProjectAvatarPicker(container, options) {
        this.init.apply(this, arguments);
    }

    ProjectAvatarPicker.prototype.init = function(container, options) {
        this.$container = $(container);

        var $previewImage = this.$container.find('.project-avatar-preview .aui-avatar-project img');
        var $input = this.$container.find('.project-avatar-upload input[name=avatar]');
        var $changeAvatarButton = this.$container.find('.project-avatar-upload button');

        if (!$previewImage.attr('src')) {
            $('<div class="project-avatar-default-preview"></div>').insertAfter($previewImage);
        }

        if (AvatarPickerDialog.isSupported()) {
            var projectAvatarPicker = new AvatarPickerDialog({
                dialogTitle: stash_i18n('stash.web.project.avatar.picker.title', 'Upload a project avatar'),
                trigger: $changeAvatarButton,
                onCrop: function(croppedDataURI) {
                    $previewImage.attr('src', croppedDataURI);
                    $input.val(croppedDataURI);
                }
            });
        } else {
            $changeAvatarButton.attr('disabled', 'disabled');
            this.$container.find('.project-avatar-upload').append('<div class="description">' + stash_i18n('stash.web.project.avatar.picker.description', 'Avatar uploads are supported with IE9+, Chrome, Firefox, or Safari.{0}Please upgrade to choose an avatar.', '<br />') + '</div>');
        }
    };

    return ProjectAvatarPicker;
});
