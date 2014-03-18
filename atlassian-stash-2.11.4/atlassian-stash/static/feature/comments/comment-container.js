define('feature/comments/comment-container', [
    'jquery',
    'underscore',
    'util/deprecation',
    'util/dom-event',
    'util/events',
    'memoir',
    'util/scroll',
    'model/page-state',
    'feature/comments/comment-model',
    'feature/comments/comment-collection',
    'feature/comments/comment-tips',
    'widget/markup-preview',
    'widget/aui/form',
    'widget/confirm-dialog'
], function (
    $,
    _,
    deprecate,
    domEventUtil,
    events,
    memoir,
    scrollUtil,
    pageState,
    Comment,
    CommentCollection,
    commentTips,
    markupPreview,
    form,
    ConfirmDialog
) {

    "use strict";

    /**
     * Backbone view. Requires:
     * * this.anchor || options.anchor,
     * * this.rootCommentListSelector || options.rootCommentListSelector
     */

    var COMMENT_CONTAINER_MIN_WIDTH = 450; // Minimum width for showing comment tips in comment form

    return Backbone.View.extend({
        initialize : function() {
            _.bindAll(this, 'onMarkupPreviewChanged');

            this.anchor = this.anchor || this.options.anchor;
            this.rootCommentListSelector = this.rootCommentListSelector || this.options.rootCommentListSelector;
            this.context = this.options.context;
            this.pullRequest = this.options.pullRequest || pageState.getPullRequest();

            if (!this.collection) {
                this.collection = new CommentCollection([], {
                    anchor : this.anchor
                });
            }

            this.initDeleteButtons();
            deprecate.triggerDeprecated('stash.feature.comments.comment-container.added', this.$el, 'stash.feature.comments.commentContainerAdded', '2.11', '3.0');
            events.trigger('stash.feature.comments.commentContainerAdded', null, this.$el);

            // We want to debounce for each instance of CommentContainer independently
            // so we have to bind the debounce at instantiation time
            var draftDebounceWait = 300;

            this.updateDraftComment = _.debounce(this.updateDraftComment, draftDebounceWait);
            //Make sure that draft deletion is always performed after any pending updates
            this.deleteDraftComment = _.debounce(this.deleteDraftComment, draftDebounceWait);
        },
        events : {
            'submit form' : 'onFormSubmit',
            'click a.times' : 'onDateClicked',
            'click .cancel' : 'onCancelClicked',
            'click .reply' : 'onReplyClicked',
            'click .edit' : 'onEditClicked',
            'keydown textarea' : 'onTextareaKeydown'
        },
        initDeleteButtons : function(e) {
            this.createDeleteDialog().attachTo('.delete', null, this.el);
        },
        createDeleteDialog : function() {
            var self = this;
            var confirmDialog = new ConfirmDialog({
                id : "delete-repository-dialog",
                titleText: stash_i18n('stash.web.comment.delete.title', 'Delete comment'),
                titleClass : 'warning-header',
                panelContent : "<p>" + stash_i18n("stash.web.comment.delete.confirm", "Are you sure that you want to delete this comment?") + "</p>",
                submitText : stash_i18n('stash.web.button.delete', 'Delete'),
                submitToHref : false
            });

            confirmDialog.addConfirmListener(function(promise, $trigger, removeDialog) {
                removeDialog();
                self.deleteComment($trigger.closest('.comment'));
            });
            return confirmDialog;
        },
        onFormSubmit : function(e) {
            e.preventDefault();
            // Comment containers can be nested (e.g. diff comment container inside activity-comment-container)
            // so we stopPropagation so it is only handled by the inner most container
            e.stopPropagation();
            this.submitCommentForm($(e.target));
        },
        onDateClicked : function(e) {
            e.preventDefault();
            // Comment containers can be nested (e.g. diff comment container inside activity-comment-container)
            // so we stopPropagation so it is only handled by the inner most container
            e.stopPropagation();
            $('.comment.focused').removeClass('focused');
            var $a = $(e.target).closest('a');
            $a.closest('.comment').addClass('focused');
            memoir.pushState(null, null, $a.prop('href'));
        },
        onCancelClicked : function(e) {
            e.preventDefault();
            // Comment containers can be nested (e.g. diff comment container inside activity-comment-container)
            // so we stopPropagation so it is only handled by the inner most container
            e.stopPropagation();
            this.cancelCommentForm($(e.target).closest('form'));
        },
        onReplyClicked : function(e) {
            e.preventDefault();
            // Comment containers can be nested (e.g. diff comment container inside activity-comment-container)
            // so we stopPropagation so it is only handled by the inner most container
            e.stopPropagation();
            this.openReplyForm($(e.target).closest('.comment'));
        },
        onEditClicked : function(e) {
            e.preventDefault();
            // Comment containers can be nested (e.g. diff comment container inside activity-comment-container)
            // so we stopPropagation so it is only handled by the inner most container
            e.stopPropagation();
            this.openEditForm($(e.target).closest('.comment'));
        },
        onTextareaKeydown : function(e) {
            if (domEventUtil.isCtrlish(e) && e.which === $.ui.keyCode.ENTER) { // Handle Ctrl+Enter/Cmd+Enter
                e.preventDefault();
                // Comment containers can be nested (e.g. diff comment container inside activity-comment-container)
                // so we stopPropagation so it is only handled by the inner most container
                e.stopPropagation();
                $(e.target).closest('form').submit();
            } else if ($(e.target).closest('.comment-container').is(this.el)) { // Handle nested comment containers
                // Unfortunately if you've written a draft, then focus in another comment form (e.g. general comment form) and press a keyboard shortcut (such as cmd+r)
                // it will treat it as a change, even though you haven't really typed anything, and it will overwrite your other draft. Bit of an edge case though.
                this.updateDraftComment(e.target);
            }
        },
        updateDraftComment : function(textArea) {
            var draft = this.getDraftCommentFromForm($(textArea).closest('form'));
            this.context && this.context.saveDraftComment(draft);
        },
        getDraftCommentFromForm: function($form){
            var draft = this.getCommentFormJSON($form);

            if (draft.anchor) {
                //commitRange adds a bunch of noise to the stored comment
                delete draft.anchor.commitRange;
            }

            // $.extend doesn't copy undefined properties. JSON.stringify throws them away, so this gives us a consistent object for equality checks,
            // regardless of whether it's retrieved from the form or from sessionStorage.
            return $.extend({}, draft);
        },
        deleteDraftComment : function(draft) {
            this.context && this.context.deleteDraftComment(draft);
        },
        getRootCommentList : function() {
            var $list = this.$(this.rootCommentListSelector);
            if (!$list.length) {
                $list = this.$el;
            }
            return $list;
        },
        render : function() {
            var $newEl = stash.feature.comments($.extend({
                comments : this.collection.toJSON()
            }, this.anchor.toJSON()));

            this.$el.replaceWith($newEl);

            this.setElement($newEl[0]);
        },
        _toJSON : function($comment, text) {
            var parentId = parseInt($comment.parent().closest('.comment').attr('data-id'), 10);
            var id = parseInt($comment.attr('data-id'), 10);
            var version = parseInt($comment.attr('data-version'), 10);
            return {
                id : !isNaN(id) ? id : undefined,
                version : !isNaN(version) ? version : undefined,
                text : text,
                anchor : this.anchor.toJSON(),
                parent : !isNaN(parentId) ? { id : parentId } : undefined
            };

        },
        getCommentJSON : function($comment) {
            return this._toJSON($comment, $comment.find('> .content > .message').attr('data-text')); // make sure to use .attr here to avoid type conversion by jQuery
        },
        getCommentFormJSON : function($form) {
            var $commentRoot = $form.parent().is('.comment') ? $form.parent() : $form;
            return this._toJSON($commentRoot, $form.find('textarea').val());
        },
        enableDeletion : function($comment) {
            $comment.find('> .content > .actions > li > .delete').parent().removeClass('hidden');
        },
        disableDeletion : function($comment) {
            $comment.find('> .content > .actions > li > .delete').parent().addClass('hidden');
        },
        renderContentUpdate : function($comment, commentJSON) {
            $comment.children('.content').replaceWith(stash.feature.commentContent({
                pullRequest: this.pullRequest && this.pullRequest.toJSON(),
                comment: commentJSON,
                hideDelete: !!$comment.find('> .replies > .comment').length
            }));
            $comment.attr('data-version', commentJSON.version).data('version', commentJSON.version);

            this.trigger('change');
            deprecate.triggerDeprecated('stash.feature.comments.comment.edited', $comment, commentJSON, this.context, 'stash.feature.comments.commentEdited', '2.11', '3.0');
            events.trigger('stash.feature.comments.commentEdited', null, commentJSON, $comment);
        },
        insertCommentIntoList : function($comment, $commentList, commentJSON) {
            var $insertBefore = $commentList.children('.comment:first');
            //TODO HACK: sort by ID is implied sort by createdDate. is that even what we want?
            while ($insertBefore.length) {
                if (parseInt($insertBefore.data('id'), 10) > commentJSON.id) {
                    break;
                }
                $insertBefore = $insertBefore.next('.comment');
            }

            $insertBefore = $insertBefore.length ?
                                $insertBefore :
                                $commentList.children('.comment-form-container:last');

            if ($insertBefore.length) {
                $comment.insertBefore($insertBefore);
            } else {
                $commentList.append($comment);
            }
        },
        renderComment : function(commentJSON, parentId, isContentUpdate) {

            var $comment;

            if (isContentUpdate && ($comment = $('.comment[data-id="' + commentJSON.id + '"]')).length) {
                return this.renderContentUpdate($comment, commentJSON);
            }

            commentJSON = $.extend({
                isNew : true
            }, commentJSON);

            var $parent = parentId && this.$('[data-id=' + parentId + ']');

            if ($parent) { // disable deleting the parent now that it has replies
                this.disableDeletion($parent);
            }

            var $insertUnder = ($parent ? // a reply
                 $parent.children('.replies') :
                 this.getRootCommentList());

            $comment = $(stash.feature.comment({
                pullRequest : this.pullRequest && this.pullRequest.toJSON(),
                numOfAncestors: $insertUnder.parents('.comment').length,
                extraClasses: this.getExtraCommentClasses(),
                comment: commentJSON
            }));

            this.insertCommentIntoList($comment, $insertUnder, commentJSON);

            // Should match the timing of the target-fade-animation in comments.less
            // We remove the clsas because Chrome bugs out and replays the animation when switching between
            // fixed and normal modes on the diff page.
            var targetFadeAnimationTime = 5000;
            setTimeout(_.bind($comment.removeClass, $comment, 'new'), targetFadeAnimationTime);

            scrollUtil.scrollTo($comment);
            $comment.hide().fadeIn('slow');

            this.trigger('change');
            deprecate.triggerDeprecated('stash.feature.comments.comment.added', $comment, commentJSON, this.context, 'stash.feature.comments.commentAdded', '2.11', '3.0');
            events.trigger('stash.feature.comments.commentAdded', null, commentJSON, $comment);
        },
        getExtraCommentClasses : function() {
            return '';  // Can be overridden for different contexts
        },
        showErrorMessage : function(model, error) {
            var $form = this;
            var $error = $form.find('.error');
            if (!$error.length) {
                $error = $('<div class="error"></div>');
                $form.find('.comment-form-footer').before($error);
            }
            $error.text(error);
        },
        cancelCommentForm : function($form) {
            this.closeCommentForm($form);
        },
        submitCommentForm : function($form) {
            if (form.isSubmissionPrevented($form)) {
                return;
            }

            var self = this;
            var $spinner = $form.find('.comment-submit-spinner');

            var commentJSON = this.getCommentFormJSON($form);
            var isEdit = commentJSON.id != null;
            var isKnown = isEdit && this.collection.get(commentJSON.id);
            var parentId = commentJSON.parent && commentJSON.parent.id;
            var comment = isKnown ? this.collection.get(commentJSON.id) : new Comment();

            comment.on('invalid', this.showErrorMessage, $form);
            if (comment.set($.extend(commentJSON, { avatarSize: stash.widget.avatarSizeInPx({ size: 'medium' }) }), { validate: true})) {
                if (!isKnown) {
                    this.collection.push(comment);
                }
                // need to override the positioning - spin.js can't handle the absolute positioning of the container.
                $form.addClass('submitting');
                $spinner.spin('medium');
                form.preventSubmission($form);
                comment.save().done(function(commentResp) {
                    // hack to avoid "future" comments
                    commentResp.createdDate = Math.min(commentResp.createdDate, new Date().getTime());
                    commentResp.updatedDate = Math.min(commentResp.updatedDate, new Date().getTime());

                    self.closeCommentForm($form, { doNotDestroy : true });
                    self.renderComment(commentResp, parentId, isEdit);
                    self.trigger('comment.saved');
                }).fail(function() {
                    if (!isKnown && !isEdit) { // it was a totally new comment. remove it from our models.
                        self.collection.remove(commentJSON.id);
                    }
                }).always(function() {
                    $spinner.spinStop();
                    $form.removeClass('submitting');
                    form.allowSubmission($form);
                });
            }
            comment.off('invalid', this.showErrorMessage);
        },
        deleteComment : function($comment) {
            var commentJSON = this.getCommentJSON($comment);
            var comment;
            if (this.collection.get(commentJSON)) {
                comment = this.collection.get(commentJSON.id);
            } else {
                comment = new Comment(commentJSON);
                this.collection.push(comment);
            }
            var $delete = $comment.find('> .content .delete'),
                deleteDims = { h : $delete.height(), w : $delete.width() };
            $delete.height(deleteDims.h).width(deleteDims.w).css('vertical-align', 'middle').empty().spin('small');

            var self = this;
            comment.destroy({ wait: true }).always(function() {
                $delete.spinStop();
            }).done(function() {
                var $parent = $comment.parent().closest('.comment');
                if ($parent.length) {
                    // has siblings if there 1) are sibling comments, or 2) there is a form being edited
                    var hasSiblings = $comment.siblings('.comment').length || $comment.siblings('.comment-form-container').find('textarea').val();
                    if (!hasSiblings) { // this was the only child. reenable deletion on its parent
                        self.enableDeletion($parent);
                    }
                }
                $comment.fadeOut(function () {
                    $comment.remove();
                    self.onCommentDeleted();

                    self.trigger('change');
                    deprecate.triggerDeprecated("stash.feature.comments.comment.deleted", commentJSON, self.context, "stash.feature.comments.commentDeleted", '2.11', '3.0');
                    events.trigger("stash.feature.comments.commentDeleted", null, commentJSON);
                });

            }).fail(function() { // revert to Delete
                $delete.css('height', '').css('width', '').css('vertical-align', '').text(stash_i18n('stash.web.comment.delete', 'Delete'));
            });
        },
        onCommentDeleted : function() {
            // Can be overridden
        },
        onMarkupPreviewChanged : $.noop,
        /**
         *
         * @param {jQuery} $comment
         * @returns {jQuery} - The comment form
         */
        openEditForm : function($comment) {
            var commentJSON = this.getCommentJSON($comment);
            var $form = $(stash.feature.commentForm($.extend({
                    tips : this.$el.width() > COMMENT_CONTAINER_MIN_WIDTH ? commentTips.tips : [],
                    currentUser: pageState.getCurrentUser() && pageState.getCurrentUser().toJSON()
                }, commentJSON)
            ));
            var $originalContent = $comment.find('> .user-avatar, > .content');
            $originalContent.remove();
            $comment.prepend($form).addClass('comment-form-container');
            $form.data('originalContent', $originalContent);
            $form.find('textarea.expanding').expandingTextarea();
            // IE scrolls the diff pane left to the start of the textarea when calling focus() immediately
            _.defer(function(){ $form.find('textarea').focus(); });

            this.trigger('change');
            deprecate.triggerDeprecated('stash.feature.comments.comment-form.displayed', $form, 'stash.feature.comments.commentFormShown', '2.11', '3.0');
            events.trigger('stash.feature.comments.commentFormShown', null, $form);

            markupPreview.bindTo($form, {
                callback : this.onMarkupPreviewChanged
            });

            return $form;
        },
        /**
         *
         * @param {jQuery} $replyToComment
         * @returns {jQuery} - The comment form
         */
        openReplyForm : function($replyToComment) {
            var $replies = $replyToComment.children('.replies');
            return this.openCommentForm($replies, { location: 'top' });
        },
        /**
         *
         * @returns {jQuery} - The comment form
         */
        openNewCommentForm : function() {
            return this.openCommentForm(this.getRootCommentList(), { location: 'bottom' });
        },
        /**
         *
         * @param {jQuery} $commentList
         * @param {?Object} options
         * @returns {jQuery} - The comment form
         */
        openCommentForm : function($commentList, options) {
            var attachmentMethod = options && options.location === 'top' ? 'prependTo' : 'appendTo';
            // check if there is a form open that is not an edit form.
            var $formContainer = $commentList.children('.comment-form-container').not('.comment');
            if (!$formContainer.length) {
                $formContainer = $(stash.feature.commentFormListItem({
                    tips : this.$el.width() > COMMENT_CONTAINER_MIN_WIDTH ? commentTips.tips : [],
                    currentUser: pageState.getCurrentUser() && pageState.getCurrentUser().toJSON()
                }))[attachmentMethod]($commentList);
            }
            $formContainer.find('textarea.expanding').expandingTextarea();
            // IE scrolls the diff pane left to the start of the textarea when calling focus() immediately
            _.defer(function() {
                $formContainer.find('textarea').focus();
            });
            var $form = $formContainer.find('form');
            markupPreview.bindTo($form, {
                callback : this.onMarkupPreviewChanged
            });

            this.trigger('change');
            deprecate.triggerDeprecated('stash.feature.comments.comment-form.displayed', $form, 'stash.feature.comments.commentFormShown', '2.11', '3.0');
            events.trigger('stash.feature.comments.commentFormShown', null, $form);

            return $form;
        },
        closeCommentForm : function($form) {
            $form.find('.error').remove(); // clear errors
            this.deleteDraftComment(this.getDraftCommentFromForm($form));

            markupPreview.unbind($form);

            var $originalContent = $form.data('originalContent');
            var $li = $form.parent();

            if ($originalContent) { // edits - the form is inside a living comment, so revert back to that comment's content.
                $li.removeClass('comment-form-container');

                $form.replaceWith($originalContent);
            } else { // it's a new comment - remove it entirely.
                $li.remove();
            }

            this.trigger('change');
            deprecate.triggerDeprecated('stash.feature.comments.comment-form.closed', $form, 'stash.feature.comments.commentFormHidden', '2.11', '3.0');
            events.trigger('stash.feature.comments.commentFormHidden', null, $form);
        },
        /**
         * For a given comment form, populate the contents of its textarea with the draft text
         * and set the appropriate attributes which are cleared on the first interaction with the comment
         * @param {jQuery|HTMLElement} form - The comment form
         * @param {Object} draft - The draft to populate from
         */
        populateCommentFormFromDraft: function(form, draft) {
            $(form).find('textarea')
                .val(draft.text)
                .addClass('restored')
                .attr("title",  stash_i18n('stash.web.comment.restored.draft.title', 'This comment has been restored from an automatically saved draft.'))
                .trigger('input') //Fake an input to trigger initial sizing of textarea
                .one('click keypress', function(){
                    $(this)
                        .removeClass('restored')
                        .removeAttr("title");
                });
        },
        /**
         * Get the comment element from the DOM with the matching comment ID
         * @param {number} commentId
         * @returns {jQuery}
         */
        getCommentElById: function(commentId){
            return this.$('.comment[data-id=' + commentId + ']');
        },
        /**
         * Attempt to restore a draft comment and return success or failure
         * @param {Object} draft
         * @returns {boolean} - success
         */
        restoreDraftComment: function(draft) {
            var $form;

            if (draft.id) {
                //edit
                var $comment = this.getCommentElById(draft.id);

                if ($comment.length) {
                    if (parseInt(draft.version, 10) < parseInt($comment.attr('data-version'), 10)  ) {
                        //to avoid overwriting an external modification, discard drafts whose version is older than the current version
                        this.context.deleteDraftComment(draft);
                        return true; //even though we didn't restore it, we don't want it to be kept around
                    }

                    $form = this.openEditForm($comment);
                }
            } else if (draft.parent) {
                //reply
                var $parent = this.getCommentElById(draft.parent.id);

                if ($parent.length) {
                    $form = this.openReplyForm($parent);
                }
            } else {
                //new comment
                $form = this.openNewCommentForm();
            }

            $form && this.populateCommentFormFromDraft($form, draft);

            return !!$form;
        },
        destroy : $.noop
    });
});
