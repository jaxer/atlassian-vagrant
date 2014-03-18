define('feature/comments/comment-context', [
    'jquery',
    'underscore',
    'util/deprecation',
    'util/events',
    'backbone',
    'util/client-storage',
    'widget/mentionable-textarea',
    'feature/comments/comment-container'
], function (
    $,
    _,
    deprecate,
    events,
    Backbone,
    clientStorage,
    MentionableTextarea,
    CommentContainer
) {

    "use strict";

    return Backbone.View.extend({
        initialize : function() {
            this._containers = {};
            this.checkForNewContainers();

            var self = this;

            events.on('stash.feature.comments.commentAdded', this._commentAddedHandler = function(commentJson, $comment) {
                if (self.$el.find($comment).length && self.$el.find('.comment').length === 1) {
                    deprecate.triggerDeprecated('stash.feature.comments.first.comment.added', self, self, 'stash.feature.comments.firstCommentAdded', '2.11', '3.0');
                    events.trigger('stash.feature.comments.firstCommentAdded', null, self.$el);
                }
            });
            this.mentionableTextarea = new MentionableTextarea({
                selector: this.mentionableTextareaSelector,
                $container: this.$el
            });

            // Support migration from single draft
            var savedDrafts =  this.getDrafts() || [];
            this.unrestoredDrafts = this.drafts = _.isArray(savedDrafts) ? savedDrafts : [savedDrafts];
            this.restoreDrafts();
        },
        mentionableTextareaSelector : '.comment-form-container textarea',
        includesContainer : function(name) {
            return _.has(this._containers, name);
        },
        registerContainer : function(containerEl, anchor) {
            var containerId = anchor.getId();
            if (!this.includesContainer(containerId)) {
                this._registerContainer(containerId, containerEl, anchor);
            }
        },
        _registerContainer : function(name, element, anchor) {
            this._containers[name] = new CommentContainer({
                name : name,
                context : this,
                el : element,
                anchor : anchor
            });
            return this._containers[name];
        },
        checkForNewContainers : function() {
            var self = this;
            _.forEach(this.findContainerElements(), function(commentContainer) {
                self.registerContainer(commentContainer, self.getAnchor(commentContainer));
            });
        },
        findContainerElements : function() {
            return this.$('.comment-container');
        },
        getAnchor : function(/*$commentContainerElement*/) {
            return this.options.anchor;
        },
        /**
         * Remove any properties from the draft that make it difficult to do an accurate "sameness" check
         * @param {Object} originalDraft
         * @returns {Object} - The modified draft
         */
        clarifyAmbiguousDraftProps: function(originalDraft) {
            //Comment text is not useful in determining "sameness"
            return _.omit(originalDraft, 'text');
        },
        deleteDraftComment : function(draft, persist) {
            persist = _.isBoolean(persist) ? persist : true;

            var isSameDraft = _.isEqual.bind(_, this.clarifyAmbiguousDraftProps(draft));

            //Remove drafts which match the supplied draft (ignoring text)
            this.drafts = _.reject(this.drafts, _.compose(isSameDraft, this.clarifyAmbiguousDraftProps.bind(this)));

            if (persist) {
                this.saveDraftComments();
            }
        },
        getDrafts : function() {
            return clientStorage.getSessionItem(this.getDraftsKey());
        },
        getDraftsKey: function() {
            return clientStorage.buildKey(['draft-comment', this.options.anchor.getId()], 'user');
        },
        /**
         * @abstract
         */
        restoreDrafts: $.noop,
        saveDraftComment: function(draft) {
            //Remove any old versions of this comment (don't persist yet)
            this.deleteDraftComment(draft, false);

            //Only add drafts that have content
            draft.text && this.drafts.push(draft);

            this.saveDraftComments();
        },
        saveDraftComments: function(){
            clientStorage.setSessionItem(this.getDraftsKey(), this.drafts);
        },
        /**
         * Clean up the comment context
         * We pass in the isFileChangeCleanup when the opt_container was not passed in the first time
         * this way we can explicitly only trigger the lastCommentDeleted event when the comment was
         * actually deleted, rather than trigger it as part of the file change cleanup.
         *
         * @param {CommentContext} opt_container
         * @param {boolean} isFileChangeCleanup
         */
        destroy : function(opt_container, isFileChangeCleanup) {
            if (opt_container) {
                opt_container.remove();
                delete this._containers[opt_container.options.name];

                if (!this.$el.has('.comment').length && !isFileChangeCleanup) {
                    deprecate.triggerDeprecated('stash.feature.comments.last.comment.deleted', this, this, 'stash.feature.comments.lastCommentDeleted', '2.11', '3.0');
                    events.trigger('stash.feature.comments.lastCommentDeleted', null, this.$el);
                }
            } else {
                isFileChangeCleanup = true;
                _.invoke(this._containers, 'remove');
                _.invoke(this._containers, 'destroy', isFileChangeCleanup);
                this._containers = null;

                if (this._commentAddedHandler) {
                    events.off('stash.feature.comments.commentAdded', this._commentAddedHandler);
                    delete this._commentAddedHandler;
                }
                if (this.mentionableTextarea) {
                    this.mentionableTextarea.destroy();
                    delete this.mentionableTextarea;
                }
            }
        }
    });
});
