define('feature/comments/activity-comment-context', [
    'underscore',
    'util/events',
    'feature/comments/comment-context',
    'feature/comments/activity-comment-container'
], function (
    _,
    events,
    CommentContext,
    ActivityCommentContainer
) {

    "use strict";

    return CommentContext.extend({
        mentionableTextareaSelector : '.general-comment-activity textarea, .general-comment-form textarea',
        findContainerElements : function() {
            return [ this.el ];
        },
        _registerContainer: function(name, element, anchor) {
            this._containers[name] = new ActivityCommentContainer({
                name : name,
                context : this,
                el : element,
                anchor : anchor
            });
            return this._containers[name];
        },
        /**
         * Get the ActivityCommentContainer for this context
         * @returns {ActivityCommentContainer}
         */
        getActivityCommentContainer: function(){
          return this._containers[this.getAnchor().getId()];
        },
        /**
         * Try and restore all the unrestored drafts, if any can't be restored, try again the next time more activities are loaded
         */
        restoreDrafts : function(){
            if (this.unrestoredDrafts.length) {
                var activityCommentContainer = this.getActivityCommentContainer();

                //Remove any restored drafts from the list
                this.unrestoredDrafts = _.reject(this.unrestoredDrafts, activityCommentContainer.restoreDraftComment.bind(activityCommentContainer));

                if (this.unrestoredDrafts.length) {
                    //There are still unrestored drafts, they might be attached to the next page of activity
                    events.once('stash.feature.pullRequestActivity.dataLoaded', this.restoreDrafts.bind(this));
                }
            }
        }
    });
});
