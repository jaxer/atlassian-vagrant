define('widget/avatar-picker-dialog', [
    'jquery',
    'underscore',
    'widget/image-tools/image-upload-and-crop',
    'util/navbuilder',
    'util/text'
], function(
    $,
    _,
    ImageUploadAndCrop,
    nav,
    TextUtil
    ) {

    'use strict';

    function AvatarPickerDialog(opts) {
        if (!AvatarPickerDialog.isSupported()) {
            throw new Error("This browser doesn't support AvatarPickerDialog.");
        }
        return this.init(opts);
    }

    AvatarPickerDialog.isSupported = function() {
        return ImageUploadAndCrop.isSupported();
    };

    AvatarPickerDialog.prototype.defaults = {
        dialogTitle: stash_i18n('stash.web.avatar.picker.title', 'Upload an avatar'),
        dialogOptions: {
            width:384, // 320px + 30px padding and 2px border on both sides
            height:610,
            id:"avatar-picker-dialog",
            closeOnOutsideClick: false,
            keypressListener: $.noop    //Don't allow cancel on `esc`
        },
        onCrop: $.noop,
        trigger: null
    };

    AvatarPickerDialog.prototype.init = function(opts){
        _.bindAll(this, 'initDialogContent', '_onImageUpload', '_onImageUploadError', '_toggleDoneButtonEnabled', 'chooseAvatar', 'hide', 'show');
        this.options = $.extend(true, {}, this.defaults, opts);
        this.$dialog = new AJS.Dialog(this.options.dialogOptions);
        this.initDialogContent();
        this._toggleDoneButtonEnabled(false);
        this.imageUploadAndCrop = new ImageUploadAndCrop(this.$dialog.getCurrentPanel().body.find('.image-upload-and-crop-container'), {
            HiDPIMultiplier: 1, //The mask is already 2x the max size we need
            onCrop: this.options.onCrop,
            onImageUpload: this._onImageUpload,
            onImageUploadError: this._onImageUploadError,
            fallbackUploadOptions: {
                uploadURL: nav.tmp().avatars().build(),
                uploadFieldName: 'avatar',
                responseHandler: function(iframeBody, uploadPromise){
                    var $iframeBody = $(iframeBody),
                        $jsonResponseField = $iframeBody.find('#json-response');

                    if ($jsonResponseField.length) {
                        var jsonResponse;

                        try {
                            jsonResponse = JSON.parse($jsonResponseField.html());
                        } catch(e) {
                            uploadPromise.reject();
                        }

                        if (jsonResponse && jsonResponse.url) {
                            uploadPromise.resolve(jsonResponse.url);
                        } else {
                            uploadPromise.reject();
                        }
                    } else {
                        // See if we can parse a meaningful error out of the response.
                        // Firstly look for the main text on the 500 error page, then strip out nested exceptions which tend to make for unfriendly messages.
                        // If it can't find the h2, it will just reject with a blank string
                        var error = $iframeBody.find('.error-image + h2').text();

                        error = error
                                    .replace(/; nested exception.*$/, '.') //remove nested exceptions
                                    .replace(/(\d+) bytes/, function(match, size){
                                        return TextUtil.formatSizeInBytes(size);
                                    }); //convert any values in bytes to the most appropriate unit

                        uploadPromise.reject(error);
                    }
                },
                cancelTrigger: this.$doneButton.add(this.$cancelButton)
            }
        });

        if (this.options.trigger) {
            this.$trigger = $(this.options.trigger);
            this.$trigger.click(_.bind(function(e){
                e.preventDefault();
                this.show();
            }, this));
        }
        return this;
    };

    AvatarPickerDialog.prototype.initDialogContent = function(){
        this.$dialog
            .addHeader(this.options.dialogTitle)
            .addPanel()
            .addSubmit("Done", this.chooseAvatar)
            .addCancel('Cancel', this.hide)
            .getCurrentPanel().body.append(stash.widget.imageTools.imageUploadAndCrop({
                description: stash_i18n('stash.web.avatar.picker.instructions', 'JPG, GIF or PNG image'),
                fallbackDescription: stash_i18n('stash.web.avatar.picker.instructions.fallback', 'JPG, GIF or PNG image up to 1MB in size')
            }));

        this.$doneButton = this.$dialog.getCurrentPanel().page.buttonpanel.find('.button-panel-submit-button');
        this.$cancelButton = this.$dialog.getCurrentPanel().page.buttonpanel.find('.button-panel-cancel-link');
    };

    AvatarPickerDialog.prototype._onImageUpload = function() {
        this._toggleDoneButtonEnabled(true);
    };

    AvatarPickerDialog.prototype._onImageUploadError = function() {
        this._toggleDoneButtonEnabled(false);
    };

    AvatarPickerDialog.prototype._toggleDoneButtonEnabled = function(opt_enable) {
        if (opt_enable == null) {
            opt_enable = this.$doneButton.attr('disabled') != null;
        }

        if (opt_enable) {
            this.$doneButton.removeAttr('disabled');
        } else {
            this.$doneButton.attr('disabled', 'disabled');
        }
    };

    AvatarPickerDialog.prototype.chooseAvatar = function(){
        this.imageUploadAndCrop.crop();
        this.hide();
    };

    AvatarPickerDialog.prototype.hide = function(){
        this.$dialog.hide();
        this.imageUploadAndCrop.resetState(); //Only resets errors and the file upload element, imageExplorer image is persisted.
    };

    AvatarPickerDialog.prototype.show = function(){
        this.$dialog.show();
    };

    return AvatarPickerDialog;
});
