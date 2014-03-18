define('feature/pull-request-edit', [
    'jquery',
    'underscore',
    'util/ajax',
    'util/focus-snapshot',
    'util/navbuilder',
    'util/dom-event',
    'util/events',
    'util/warn-before-unload',
    'model/revision-reference',
    'widget/mentionable-textarea',
    'widget/markup-preview',
    'feature/repository/branch-selector',
    'feature/user/user-multi-selector'
], function(
    $,
    _,
    ajax,
    focus,
    nav,
    domEventUtil,
    events,
    warnBeforeUnload,
    RevisionReference,
    MentionableTextarea,
    markupPreview,
    BranchSelector,
    UserMultiSelector
) {

    var REVIEWERS = "reviewers",
        PULL_REQUEST_OUT_OF_DATE_EXCEPTION = 'com.atlassian.stash.pull.PullRequestOutOfDateException';

    function PullRequestEdit(pullRequest, options){
        var defaults = {
            width:800,
            height:350,
            id:"edit-pull-request-dialog",
            closeOnOutsideClick: false,
            focusSelector: '#description', // do not remove, otherwise this effectively disables mention support in the dialog
            keypressListener:_.bind(this.keypressListener, this)
        };

        this._pullRequest = pullRequest;
        this._currentReviewerUsers = this._pullRequest.getReviewers();
        this._opts = $.extend({}, defaults, options);
        this._dialog = new AJS.Dialog(this._opts);
        this._dialogEl = $('#' + this._opts.id);
        this._isDisabled = false;
        this.initDialog();
    }

    PullRequestEdit.prototype.keypressListener = function(e) {
        e.stopImmediatePropagation();   // AUIDialog.updateHeight() rebinds the keypressListener at every call, even if it's already bound to the event;
        // thus we need to have jQuery stops the immediate propagation of the event to prevent successive invocations.
        // For example, the sequence dialog.show().updateHeight().updateHeight() would have the handler bound three times.
        // MM: I've verified the above comment (found in useredit.js:initialisePasswordDialog) and raise an issue for it here - https://ecosystem.atlassian.net/browse/AUI-1054

        // Handle Ctrl+Enter/Cmd+Enter
        // TODO: Add to keyboard shortcut dialog?
        if (domEventUtil.isCtrlish(e) && e.which === $.ui.keyCode.ENTER) {
            e.preventDefault();
            $('.button-panel-submit-button', this._dialogEl).click();
        }
        if (e.keyCode === 27 && this._dialogEl.is(":visible") && !this._isDisabled) { //Esc closes dialog only when it's not disabled (has pending request)
            markupPreview.unbind(this._dialog.getCurrentPanel().body);
            this.hide();
        }
    };

    PullRequestEdit.prototype.initDialog = function() {
        this._$buttonPanel = this._dialog
            .addHeader(stash_i18n("stash.web.pull-requests.edit.header", "Edit Pull Request"))
            .addPanel(stash_i18n("stash.web.pull-requests.edit.header", "Edit Pull Request"))
            .addSubmit(stash_i18n('stash.web.button.save', 'Save'), _.bind(this.save, this))
            .addCancel(stash_i18n('stash.web.button.cancel', 'Cancel'), _.bind(this.cancel, this))
            .getPage(0).buttonpanel;

        this._$spinner = $('<div class="spinner"></div>').prependTo(this._$buttonPanel);

        this.mentionableTextarea = new MentionableTextarea({
            selector: '.pull-request-description textarea',
            $container: this._dialogEl
        });

        this.triggerPanelResize = _.bind(this.triggerPanelResize, this);
    };

    PullRequestEdit.prototype.populatePanelFromPullRequest = function() {
        this.updatePanel({
            title: this._pullRequest.getTitle(),
            description : this._pullRequest.getDescription(),
            // TODO It shouldn't be required to add type - https://jira.atlassian.com/browse/STASHDEV-3538
            toRef: _.extend({type: RevisionReference.type.BRANCH}, this._pullRequest.getToRef().toJSON()),
            reviewers: this._currentReviewerUsers.map(function(reviewer){
                return reviewer.getUser().toJSON();
            })
        });
    };

    PullRequestEdit.prototype.triggerPanelResize = function () {
        // blocks any resize of the dialog if it is maximised. Otherwise the method used by updateHeight() (which resets
        // the height of all dialog's panels to 'auto' to compute their unconstrained heights) means that any vertical
        // scrollbar is removed and then restored to its top position when the panel's height is assigned to the computed
        // height value.
        // For the user, this results in a jump of the scroll position to the top, as he/she is typing.
        // Additionally, memorizing the scroll position before invoking updateHeight() is not a solution either,
        // because the new vertical scrollbar might have a different scroll length after the resize of the panel.
        var isDialogMaximised = this._dialog.isMaximised();
        var visiblePanel = this._dialog.getCurrentPanel().body;
        var visiblePanelHasNoScrollbar = visiblePanel.innerHeight() >= visiblePanel.get(0).scrollHeight; // used to get out of the maximised state
        if (!isDialogMaximised || visiblePanelHasNoScrollbar) {
            _.defer(_.bind(function () {
                if (this.isVisible()) {
                    focus.save();
                    this._dialog.updateHeight();
                    focus.restore();
                }
            }, this));
        }
    };

    PullRequestEdit.prototype.updatePanel = function(templateData) {
        var $editPanel = this._dialog.getCurrentPanel().body;

        if (templateData.reviewers.length && templateData.reviewers[0].user) {
            //If we are supplied a collection of Pull Request Participants (with role and approval state) , pluck out just the user object.
            templateData.reviewers = _.pluck(templateData.reviewers, 'user');
        }

        $editPanel.empty().append(stash.feature.pullRequest.edit(templateData));
        this.userSelect = new UserMultiSelector($editPanel.find("#reviewers"), {
            initialItems: templateData.reviewers,
            excludedItems: [this._pullRequest.getAuthor().getUser().toJSON()] //Exclude the PR author from the user select, rather than the current user.
        });

        var $branchSelectorTrigger = $editPanel.find('#toRef');
        this.branchSelector = new BranchSelector($branchSelectorTrigger, {
            id: 'toRef-dialog',
            repository: this._pullRequest.getToRef().getRepository(),
            field: $branchSelectorTrigger.next('input')
        });

        // markup preview support
        markupPreview.bindTo($editPanel, { callback:this.triggerPanelResize });
        $editPanel.find('textarea.expanding').expandingTextarea({
            resize: this.triggerPanelResize
        });
        this.triggerPanelResize();
    };

    function toReviewer(user) {
        return {
            user : user
        };
    }

    PullRequestEdit.prototype.getPullRequestUpdateFromForm = function($form) {
        return {
            title: $form.find('#title').val(),
            description: $form.find('#description').val(),
            reviewers: _.map(this.userSelect.getSelectedItems(), toReviewer),
            toRef: this.branchSelector.getSelectedItem().toJSON(),
            version: this._pullRequest.getVersion()
        };
    };

    PullRequestEdit.prototype.save = function(dialog, page) {
        if (this._isDisabled) {
            return;
        }

        var self = this,
            pullRequestUpdate = this.getPullRequestUpdateFromForm(page.getCurrentPanel().body.find('form'));

        if (!pullRequestUpdate.title) {
            //PR title is empty, which means the rest endpoint would ignore it.
            var noTitleError = stash_i18n('stash.web.pull-request.edit.no.title', 'You must supply a title for this pull request.');
            self.updatePanel($.extend({ fieldErrors: {'title' : [noTitleError]} }, pullRequestUpdate));
            return;
        }

        this._$spinner.show().spin('small');
        self.toggleDisabled(true);

        var request = ajax.rest({
            url: nav.rest()
                    .currentPullRequest()
                    .withParams({avatarSize : stash.widget.avatarSizeInPx({ size: 'xsmall' })})
                    .build(),
            type: 'PUT',
            data: pullRequestUpdate,
            statusCode : {
                '400' : false,
                '409' : false
                //TODO: complete this list
            }
        });

        warnBeforeUnload(request, stash_i18n('stash.web.pull-request.pending.request', 'You have made changes to the pull request that have not yet reached Stash. If you leave this page, those changes will be lost.'));

        request.done(function(updatedPullRequest) {
            //TODO: in future we should use `new PullRequest(updatedPullRequest))` to update the page without a refresh.
            // We should maybe consider doing this.mentionableTextarea.destroy/reset in that instance, depending on what changes on the page.
            window.location.reload();
        });

        request.fail(function(xhr, testStatus, errorThrown, data, fallbackError){
            var errors = [],
                fieldErrors = {},
                validReviewers;

                _.each(data.errors, function(error) {
                    if(error.context){
                        if (!Object.prototype.hasOwnProperty.call(fieldErrors, error.context)) {
                            fieldErrors[error.context] = [];
                        }
                        if (error.context === REVIEWERS) {
                            // This is a bit clunky, but the rest response has the per user error messages and
                            // the collection of valid users _inside_ the single com.atlassian.stash.pull.InvalidPullRequestParticipantException
                            fieldErrors[error.context] = _.pluck(error.reviewerErrors, "message");
                            errors.push(error);
                            validReviewers = error.validReviewers;
                        } else {
                            fieldErrors[error.context].push(error.message);
                        }
                    } else {
                        if(error.exceptionName === PULL_REQUEST_OUT_OF_DATE_EXCEPTION) {
                            //remove hash from href, else the browser will treat it as a hash change and won't refresh.
                            error.message += " <a href='" + window.location.href.split("#")[0] + "'>" + stash_i18n('stash.web.reload', 'Reload') + "</a>.";
                        }
                        errors.push(error);
                    }
                });

            //$.extend will ignore undefined properties, so if validReviewers is undefined, it will not overwrite pullRequestUpdate.reviewers
            self.updatePanel($.extend({ errors: errors, fieldErrors: fieldErrors }, pullRequestUpdate, { reviewers: validReviewers }));
            self._$spinner.spinStop().hide();
            self.toggleDisabled(false);
        });
    };

    PullRequestEdit.prototype.toggleDisabled = function(disable) {
        if (typeof disable === undefined) {
            disable = !this._isDisabled;
        }

        this._$buttonPanel.toggleClass("disabled", disable);
        this._$buttonPanel.find('button')[(disable) ? "attr" : "removeAttr"]('disabled', 'disabled');
        this._dialog[disable ? 'disable' : 'enable']();
        this._isDisabled = disable;
    };

    PullRequestEdit.prototype.cancel = function() {
        if (!this._isDisabled) {
            markupPreview.unbind(this._dialog.getCurrentPanel().body);
            this.hide();
        }
    };

    PullRequestEdit.prototype.isVisible = function() {
        return this._dialogEl.is(":visible");
    };

    PullRequestEdit.prototype.show = function() {
        this.populatePanelFromPullRequest();
        this._dialog.show();
        events.on('window.resize.debounced', this.triggerPanelResize);
    };

    PullRequestEdit.prototype.hide = function() {
        document.activeElement.blur(); //Prevent dialog from maintaining focus on hide. https://ecosystem.atlassian.net/browse/AUI-1059
        this._dialog.hide();
        events.off('window.resize.debounced', this.triggerPanelResize);
    };

    PullRequestEdit.prototype.bind = function(selector) {
        var self = this;

        $(document).on('click', selector, function(e){
            e.preventDefault();

            self.show();
        });
    };

    return PullRequestEdit;
});
