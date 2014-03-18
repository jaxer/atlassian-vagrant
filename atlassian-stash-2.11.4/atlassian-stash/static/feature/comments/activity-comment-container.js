define('feature/comments/activity-comment-container', [
    'jquery',
    'underscore',
    'util/events',
    'widget/markup-preview',
    'feature/comments/comment-container'
], function (
    $,
    _,
    events,
    markupPreview,
    CommentContainer
) {

    "use strict";

    return CommentContainer.extend({
        initialize: function() {
            CommentContainer.prototype.initialize.apply(this, arguments);
        },
        rootCommentListSelector : '.pull-request-activity',
        events : _.extend({}, CommentContainer.prototype.events, {
            'focus .general-comment-form textarea' : 'onGeneralFormTextareaFocused'
        }),
        initDeleteButtons : function() {
            this.createDeleteDialog().attachTo('.general-comment-activity .delete', null, this.el);
        },
        insertCommentIntoList : function($comment, $commentList, commentJSON) {
            if ($commentList.is(this.rootCommentListSelector)) {
                // TODO: we need to order it along with other activity items.
                // Luckily, until we do activity reloading, we can be assured we're only adding comments at the top.

                var $generalCommentForm = $commentList.children(':first');
                $comment.insertAfter($generalCommentForm);
            } else {
                CommentContainer.prototype.insertCommentIntoList.apply(this, arguments);
            }
        },
        closeCommentForm : function($form) {
            // don't close the general comment form, just empty it out. Clean up any restored draft attributes
            $form.find('.error').remove(); // clear errors
            if ($form.is('.general-comment-form')) {
                $form.addClass('collapsed');
                $form.find('textarea')
                    .val('')
                    .trigger('input') //Fake an input to reset the size of the textarea
                    .removeClass('restored')
                    .removeAttr("title")
                    .blur();

                this.deleteDraftComment(this.getDraftCommentFromForm($form));
                markupPreview.unbind($form);
            } else {
                CommentContainer.prototype.closeCommentForm.apply(this, arguments);
            }
        },
        getExtraCommentClasses : function() {
            return 'general-comment-activity';
        },
        onGeneralFormTextareaFocused : function(e) {
            var $form = $(e.target).closest('.general-comment-form');
            markupPreview.bindTo($form);
            $form.removeClass('collapsed');
        },
        destroy : $.noop
    });
});
