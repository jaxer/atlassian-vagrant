define('page/admin/userEdit', [
    'aui',
    'jquery',
    'underscore',
    'util/ajax',
    'util/error',
    'util/flash-notifications',
    'util/navbuilder',
    'widget/delete-dialog',
    'widget/confirm-dialog',
    'widget/submit-spinner',
    'feature/user/user-groups-table',
    'exports'
], function(
    AJS,
    $,
    _,
    ajax,
    errorUtil,
    flashNotifications,
    navBuilder,
    DeleteDialog,
    ConfirmDialog,
    SubmitSpinner,
    UserGroupsTable,
    exports
    ) {

    'use strict';

    function notify(content) {
        var $notification = $('.content-body .notifications');
        $notification.empty().html(content);
    }

    function notifySuccess(message) {
        notify(widget.aui.message.success({ content: message }));
    }

    function setErrorSpan(fieldSelector, message) {
        $(fieldSelector).parent(".field-group").append($("<span class='error'></span>").text(message));
    }

    function clearErrors() {
        $('.panel-details .error, .content-body .notifications > .error').remove();
    }

    function notifyErrors(errors) {
        if (_.isArray(errors)) {
            _.each(errors, function(error) {
                if (error.message && error.context && error.context === 'email') {
                    setErrorSpan("#email", error.message);
                } else if (error.message && error.context && error.context === 'displayName') {
                    setErrorSpan("#fullname", error.message);
                } else if (error.message) {
                    notify(widget.aui.message.error({ content: AJS.escapeHtml(error.message) }));
                } else {
                    notify(widget.aui.message.error({ content: AJS.escapeHtml(error) }));
                }
            });
        } else if (_.isString(errors)) {
            notify(widget.aui.message.error({ content: AJS.escapeHtml(errors) }));
        }
    }

    // dialog to confirm the deletion of the user
    function initialiseDeleteDialog(deleteLink) {
        DeleteDialog.bind(deleteLink,
            stash_i18n('stash.web.users.delete', 'Delete user'),
            stash_i18n('stash.web.users.delete.success', 'The user {0} was successfully deleted.'),
            stash_i18n('stash.web.users.delete.fail', 'The user could not be deleted.'),
            function(name) {
                flashNotifications.addNotification(stash_i18n('stash.web.users.delete.success', 'The user {0} was successfully deleted.', name));
                window.location = navBuilder.admin().users().build();
                return false; // don't notify on view page, wait for page-pop
            }, function() {
                return $('#fullname').val();
            });
    }

    function initialiseClearCaptchaDialog(clearCaptchaLink) {
        var $panelContent = $(stash.admin.users.clearCaptchaDialog({ displayName : $('#fullname').val() }));

        var confirmDialog = new ConfirmDialog({
            id: "clear-captcha-dialog",
            titleText: stash_i18n("stash.web.users.captcha.clear", "Clear CAPTCHA challenge"),
            panelContent: $panelContent,
            submitText: stash_i18n('stash.web.button.clear', 'Clear')
        }, { type: 'DELETE' });

        confirmDialog.attachTo(clearCaptchaLink);

        confirmDialog.addConfirmListener(function(promise) {
            promise.done(function() {
                $(clearCaptchaLink).remove();
                confirmDialog.destroy();
                notifySuccess(stash_i18n('stash.web.users.captcha.cleared', 'CAPTCHA challenge cleared.'));
            });
        });
    }

    // dialog to change the password
    function initialisePasswordDialog(username, passwordLink) {
        $(passwordLink).click(function (e) {
            e.preventDefault();

            var $form = $(stash.admin.users.passwordResetForm({}));

            var dialog = new AJS.Dialog({
                width: 433,
                id: 'change-password-dialog',
                closeOnOutsideClick: false,
                keypressListener: function (e) {
                    // AUIDialog.updateHeight() rebinds the keypressListener at every call, even if it's already bound to the event;
                    // thus we need to have jQuery stops the immediate propagation of the event to prevent successive invocations.
                    // For example, the sequence dialog.show().updateHeight().updateHeight() would have the handler bound three times.
                    e.stopImmediatePropagation();
                    if (e.keyCode === $.ui.keyCode.ENTER) {
                        e.preventDefault();
                        $(this).find('.button-panel-submit-button').click();
                    } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                        e.preventDefault();
                        dialog.remove();
                    }
                }
            });
            dialog.addHeader(AJS.escapeHtml(stash_i18n('stash.web.users.change.password.dialog', 'Change the password for {0}', username)));

            dialog.addPanel('content', $form);
            dialog.addSubmit(stash_i18n('stash.web.button.save', 'Save'), function (dialog) {
                var $spinner = new SubmitSpinner($(dialog.getPage(0).buttonpanel).find('.button-panel-submit-button'), 'before').show();

                dialog.disable();  // Prevent double submission
                var buttonPanel = dialog.getPage(0).buttonpanel;
                buttonPanel.addClass('disabled');

                ajax.rest({
                    url: $form.attr('action'),
                    type: 'PUT',
                    data: _.extend({ name: username }, ajax.formToJSON($form)),
                    statusCode: {
                        '*': function() {
                            return false;
                            /* this is already a popup: handle all the errors locally */
                        }
                    }
                }).always(function() {
                        $spinner.remove();
                    }).done(function () {
                        dialog.remove();
                        notifySuccess(stash_i18n('stash.web.users.password.update.success', 'Password successfully updated.'));
                    }).fail(function (xhr, textStatus, errorThrown, data) {
                        dialog.enable();
                        buttonPanel.removeClass('disabled');


                        errorUtil.setFormErrors($form,
                            (data && data.errors && data.errors[0] && data.errors[0].message) ?
                                data.errors :
                                [
                                    { message: stash_i18n('stash.web.users.change.password.failure', 'The password could not be changed.') }
                                ]
                        );
                        dialog.updateHeight();
                    });

            });
            dialog.addCancel(stash_i18n('stash.web.button.cancel', 'Cancel'), function (dialog) {
                dialog.remove();
            });
            dialog.show();
            dialog.updateHeight();
        });
    }

    // dialog to rename the user
    function initialiseRenameDialog(username, renameLink) {
        $(renameLink).click(function (e) {
            e.preventDefault();
            var $form = $(stash.admin.users.renameUserForm({}));

            var dialog = new AJS.Dialog({
                width: 433,
                id: 'rename-user-dialog',
                closeOnOutsideClick: false,
                keypressListener: function (e) {
                    // AUIDialog.updateHeight() rebinds the keypressListener at every call, even if it's already bound to the event;
                    // thus we need to have jQuery stops the immediate propagation of the event to prevent successive invocations.
                    // For example, the sequence dialog.show().updateHeight().updateHeight() would have the handler bound three times.
                    e.stopImmediatePropagation();
                    if (e.keyCode === $.ui.keyCode.ENTER) {
                        e.preventDefault();
                        $(this).find('.button-panel-submit-button').click();
                    } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                        e.preventDefault();
                        dialog.remove();
                    }
                }
            });
            dialog.addHeader(stash_i18n('stash.web.users.rename.user.dialog', 'Rename {0}', username));
            dialog.addPanel('content', $form);
            dialog.addSubmit(stash_i18n('stash.web.button.save', 'Save'), function (dialog) {
                var $spinner = new SubmitSpinner($('.button-panel-submit-button', dialog.getPage(0).buttonpanel), 'before').show();

                dialog.disable();  // Prevent double submission
                var buttonPanel = dialog.getPage(0).buttonpanel;
                buttonPanel.addClass('disabled');

                ajax.rest({
                    url: $form.attr('action'),
                    type: 'POST',
                    data: _.extend({ name: username }, ajax.formToJSON($form)),
                    statusCode: {
                        '*': function () {
                            return false;
                            /* this is already a popup: handle all the errors locally */
                        }
                    }
                }).always(function () {
                        $spinner.remove();
                    }).done(function (renamedUser) {
                        flashNotifications.addNotification(stash_i18n('stash.web.users.rename.success', 'User successfully renamed.'));
                        location.href = navBuilder.admin().users().view(renamedUser.name).build();
                    }).fail(function (xhr, textStatus, errorThrown, data) {
                        dialog.enable();
                        buttonPanel.removeClass('disabled');

                        errorUtil.setFormErrors($form,
                            (data && data.errors && data.errors[0] && data.errors[0].message) ?
                                data.errors :
                                [
                                    { message: stash_i18n('stash.web.users.rename.failure', 'The user could not be renamed.') }
                                ]);
                        dialog.updateHeight();
                    });

            });
            dialog.addCancel(stash_i18n('stash.web.button.cancel', 'Cancel'), function (dialog) {
                dialog.remove();
            });
            dialog.show();
            dialog.updateHeight();
        });
    }

    // form for editing user details
    function initialiseForm() {

        // utility functions
        function rollback($form) {
            $form.find('input[type=text]').each(function() {
                var $this = $(this);
                $this.val($this.data('rollback'));
            });
        }
        function updateDetails($form, data) {
            $form.find('#fullname').val(data.displayName);
            $form.find('#email').val(data.emailAddress);
            $form.find('input[type=text]').each(function() {
                var $this = $(this);
                $this.data('rollback', $this.val());
            });
        }
        function closeEditDetails($form) {
            $form.removeClass('editing').find('#fullname, #email').attr('readonly', 'readonly');
            $('#ajax-status-message').empty();
            clearErrors();
        }

        // event bindings
        $('#edit-details').click(function(e) {
            $('.panel-details form.editable').addClass('editing').find('#fullname, #email').removeAttr('readonly');
            if (e.target.id !== 'email') {
                $('#fullname', '.panel-details form.editable').focus();
            }
            e.preventDefault();
        });
        $('.panel-details form.editable').keyup(function(e) {
            if(e.which === $.ui.keyCode.ENTER) {
                $('.save', this).click();
            } else if (e.which === $.ui.keyCode.ESCAPE) {
                $('a.cancel', this).click();
            }
        });
        $('.cancel', '.panel-details form.editable').click(function(e) {
            e.preventDefault();
            var $form = $(this).parents('form');
            rollback($form);
            closeEditDetails($form);
            return false;
        });
        $('.save', '.panel-details form.editable').click(function(e) {
            e.preventDefault();
            clearErrors();
            var $form = $(this).parents('form');
            var displayName = $form.find('#fullname').val();
            ajax.rest({
                url: $form.attr('action'),
                type: 'PUT',
                data: {
                    name: $form.find('#name').val(),
                    displayName: displayName,
                    email: $form.find('#email').val()
                },
                statusCode : { // these errors are handled locally.
                    '500' : function() {
                        return false;
                    },
                    '404' : function() {
                        return false;
                    },
                    '401' : function() {
                        return false;
                    },
                    '400' : function() {
                        return false;
                    }
                }
            }).done(function(data) {
                updateDetails($form, data);
                closeEditDetails($form);
                notifySuccess(stash_i18n('stash.web.users.update.success', '{0}{1}{2} was successfully updated.', "<strong>", AJS.escapeHtml(displayName), "</strong>"));
            }).fail(function (xhr, textStatus, errorThrown, data) {
                var errors = (data && data.errors) ? data.errors : stash_i18n('stash.web.users.update.failure', 'The user could not be updated.');
                notifyErrors(errors);
            });
        });
    }

    function initialiseUserGroupsTable(groupsTableSelector) {
        var userGroupsTable = new UserGroupsTable({
            target: groupsTableSelector,
            onError: notifyErrors
        });
        userGroupsTable.init();
    }

    exports.onReady = function(username, selectors) {
        flashNotifications.attachNotifications('.content-body .notifications', 'html');

        initialiseDeleteDialog(selectors.deleteLinkSelector);
        initialiseClearCaptchaDialog(selectors.clearCaptchaLinkSelector);
        initialisePasswordDialog(username, selectors.passwordLinkSelector);
        initialiseRenameDialog(username, selectors.renameUserLinkSelector);
        initialiseForm();
        initialiseUserGroupsTable(selectors.groupsTableSelector);

        $(document).ready(function() {
            if (location.hash) {
                $('.menu-item > a[href="' + location.hash + '"]').click();
            }
        });

    };
});
