define('feature/comments/diff-comment-container', [
    'jquery',
    'underscore',
    'util/deprecation',
    'util/events',
    'feature/comments/comment-container'
], function (
    $,
    _,
    deprecate,
    events,
    CommentContainer
) {

    "use strict";

    var padding;
    events.on('memoir.changestate', function() {
        // when you pushstate between tabs, reset padding because diff-tab includes a margin for the add comment column
        padding = null;
    });

    return CommentContainer.extend({
        rootCommentListSelector : '.comment-list',
        initialize : function() {
            _.bindAll(this, 'onResize');

            // if no element is passed in, Backbone gives us a div we don't need. Gee, thanks!
            // we want to generate an element in that case.
            if (!this.$el.is('.comment-container')) {
                this.setElement($(stash.feature.comments($.extend({
                    extraClasses: 'comment-box',
                    comments : this.options.collection && this.options.collection.toJSON()
                }, this.options.anchor.toJSON())))[0]);
            }

            if (!this.isFileCommentContainer() && this.options.context.diffView) {
                this._widget = this.options.context.diffView.addLineWidget(this.options.lineHandle, this.el, {
                    noHScroll : true,
                    coverGutter: true,
                    insertAt : 0
                });

                this.options.context.diffView.addLineClass(this.options.lineHandle, 'wrap', 'commented');
            }

            this.$el.on('resize.expanding ', this.onResize);
            this.on('change', this.onResize);
            this.on('comment.saved', this.scrollIntoView);

            CommentContainer.prototype.initialize.apply(this, arguments);
        },
        closeCommentForm : function($form, options) {
            // try to destroy the box, unless the doNotDestory flag is set.
            // this flag is set when a comment is successfully submitted and the form is about to be replaced with a comment.
            if (!options || !options.doNotDestroy) {
                var $commentList = $form.parent().parent();

                // if this is a top-level form and there are no comments, remove the container.
                if ($commentList.is(this.rootCommentListSelector) && $commentList.children('.comment').length === 0) {
                    this.deleteDraftComment(this.getDraftCommentFromForm($form));
                    return this.destroy();
                }
            }

            return CommentContainer.prototype.closeCommentForm.apply(this, arguments);
        },
        destroyIfEmpty : function() {
            var $commentList = this.$(this.rootCommentListSelector);
            if ($commentList.children('.comment').length === 0 && !$commentList.find('textarea').val()) {
                this.destroy();
            }
        },
        /**
         * Clean up
         *
         * @param [isFileChangeCleanup] Passed through from {@link feature/comments/comment-context.destroy}
         */
        destroy : function(isFileChangeCleanup) {
            padding = null;

            if (this._widget) {
                this._widget.clear();
                this._widget = null;
            }

            this.$el.off('resize.expanding', this.onResize);
            this.off('change', this.onResize);

            if (this.options.lineHandle) {
                this.options.context.diffView.removeLineClass(this.options.lineHandle, 'wrap', 'commented');
            }
            deprecate.triggerDeprecated('stash.comment.comment-container.destroyed', this, 'stash.comment.commentContainerDestroyed', '2.11', '3.0');
            events.trigger('stash.comment.commentContainerDestroyed', null, this.$el);
            this.context.destroy(this, isFileChangeCleanup);
        },
        onCommentDeleted : function() {
            this.destroyIfEmpty();
        },
        onMarkupPreviewChanged : function() {
            this.onResize();
            this.scrollIntoView();
        },
        onResize : function() {
            if (this._widget) {
                this._widget.changed();
            }
            this.trigger('resize');
        },
        openNewCommentForm: function () {
            var form = CommentContainer.prototype.openNewCommentForm.apply(this);
            this.scrollIntoView();
            return form;
        },
        /**
         * Scroll to the handle where the widget was changed to prevent comments that are
         * rendered at the bottom of a diff to appear off-screen.
         */
        scrollIntoView: function () {
            if (!this.isFileCommentContainer()) {
                this.options.context.diffView.scrollHandleIntoView(this.options.lineHandle);
            }
        },
        isFileCommentContainer : function() {
            return !!this.$el.closest('.file-comments').length;
        }
    });
});