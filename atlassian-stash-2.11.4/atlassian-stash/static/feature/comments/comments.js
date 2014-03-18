define('feature/comments', [
    'jquery',
    'feature/comments/diff-comment-context',
    'feature/comments/activity-comment-context',
    'feature/comments/anchors',
    'feature/comments/comment-tips'
],
function (
    $,
    DiffCommentContext,
    ActivityCommentContext,
    anchors,
    commentTips
) {

    "use strict";

    var commentMode = {
        CREATE_NEW : 'create-new', // allow top-level commenting, replying, and display all comments
        REPLY_ONLY : 'reply-only', // only allow writing replies, not new top-level comments
        READ : 'read', // show comments, don't allow creating any TODO: Not yet supported anywhere
        NONE : 'none' // don't show any comments or allow commenting
    };

    return $.extend({
        /**
         * Bind all comments within a $contextEl to a given anchor type (pull request activity or diff)
         * @param $contextEl
         * @param anchor
         */
        bindContext : function($contextEl, anchor, options) {
            if ($contextEl.data('comment-context')) {
                throw new Error('Duplicate comment context registered.');
            }

            var showComments = options && (options.commentMode === commentMode.READ ||
                                           options.commentMode === commentMode.CREATE_NEW ||
                                           options.commentMode === commentMode.REPLY_ONLY);
            var allowCommenting = options && options.commentMode === commentMode.CREATE_NEW;

            options = $.extend({
                el : $contextEl[0],
                anchor : anchor,
                allowCommenting : allowCommenting,
                showComments : showComments
            }, options);

            var context = anchor instanceof anchors.DiffAnchor ?
                    new DiffCommentContext(options) :
                    new ActivityCommentContext(options);
            $contextEl.data('comment-context', context);
            return context;
        },
        updateContext : function($contextEl) {
            var context = $contextEl.data('comment-context');
            if (context) {
                context.checkForNewContainers();
            }
        },
        unbindContext : function($contextEl) {
            var context = $contextEl.data('comment-context');
            if (context) {
                context.destroy();
            }
        },
        commentMode : commentMode
    }, anchors, commentTips);
});