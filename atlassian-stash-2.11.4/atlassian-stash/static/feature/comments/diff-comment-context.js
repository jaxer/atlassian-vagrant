define('feature/comments/diff-comment-context', [
    'jquery',
    'underscore',
    'util/events',
    'util/function',
    'feature/comments/comment-collection',
    'feature/comments/comment-context',
    'feature/comments/diff-comment-container',
    'feature/comments/anchors',
    'feature/file-content/diff-view-segment-types',
    'feature/file-content/diff-view-file-types'
], function (
    $,
    _,
    events,
    fn,
    CommentCollection,
    CommentContext,
    DiffCommentContainer,
    anchors,
    DiffSegmentTypes,
    DiffFileTypes
) {

    "use strict";

    var LineAnchor = anchors.LineAnchor;

    return CommentContext.extend({
        events : {
            'click .line:not(.expanded):not(.conflict-marker) .add-comment-trigger' : 'addCommentClicked'
        },
        initialize : function() {
            _.bindAll(this, 'onDiffChange', 'onFileCommentsResized');

            this.setDiffView(this.options.diffView);

            // create a map of comment objects indexed by their ID
            this._commentsById = this.options.lineComments && _.indexBy(this.options.lineComments, fn.dot('id'));

            this.$el.toggleClass('commentable', this.options.allowCommenting);

            this.renderFileComments();

            CommentContext.prototype.initialize.apply(this, arguments);
            
            var fileCommentContainer = this._getFileCommentContainer();
            if (fileCommentContainer) {
                this._initializeFileCommentContainer(fileCommentContainer);
            }
        },
        _initializeFileCommentContainer : function(fileCommentContainer) {
            fileCommentContainer.on('resize', this.onFileCommentsResized);
        },
        /**
         * Get the comment container for file comments if it exists.
         * @private
         */
        _getFileCommentContainer : function() {
            var anchor = this.options.anchor;
            var containerId = anchor.getId();
            if (this.includesContainer(containerId)) {
                return this._containers[containerId];
            }
        },
        _registerContainer : function(name, element, anchor) {
            this._containers[name] = new DiffCommentContainer({
                anchor : anchor,
                context : this,
                el : element,
                name : name
            });
            return this._containers[name];
        },
        addFileCommentClicked : function() {
            var container = this.addCommentContainerForFile();
            container.openNewCommentForm();
        },
        addCommentClicked : function(e) {
            e.preventDefault();

            var $line = $(e.target).closest('.line');
            var container = this.addCommentContainerForLine($line);
            container.openNewCommentForm();
        },
        addCommentContainerForFile : function() {
            var fileCommentContainer = this._getFileCommentContainer();
            if (fileCommentContainer) {
                return fileCommentContainer;
            }

            var $commentContainer = $(stash.feature.comments(this.options.anchor.toJSON()));
            $commentContainer.appendTo(this.$('.file-comments'));
            this.registerContainer($commentContainer[0], this.options.anchor);

            fileCommentContainer = this._getFileCommentContainer();
            this._initializeFileCommentContainer(fileCommentContainer);

            return fileCommentContainer;
        },
        addCommentContainerForLine : function($line, commentsJSON) {
            var anchor = this.getLineAnchor($line);
            var lineHandle = $line.lineType ? $line : this.diffView.getLineHandle($line);
            var containerId = anchor.getId();
            if (!this.includesContainer(containerId)) {
                this._containers[containerId] = new DiffCommentContainer({
                    anchor : anchor,
                    collection : commentsJSON ? new CommentCollection(commentsJSON, {
                        anchor : anchor
                    }) : undefined,
                    context : this,
                    lineHandle : lineHandle,
                    name : containerId
                });
            }
            return this._containers[containerId];
        },
        destroy : function(opt_container) {

            if (!opt_container) {
                if (this.diffView) {
                    this.diffView.off('change',this.onDiffChange);
                }
                this.$el.removeClass('commentable');
            }

            CommentContext.prototype.destroy.apply(this, arguments);
        },
        findContainerElements : function() {
            return this.$('.line .comment-box, .file-comments > .comment-container');
        },
        getAnchor : function(commentContainerEl) {
            if ($(commentContainerEl).closest('.file-comments').length) {
                return this.options.anchor;
            }
            return this.getLineAnchor($(commentContainerEl).closest('.line'));
        },
        getGutterId : function() {
            return this.options.allowCommenting ? 'add-comment-trigger' : null;
        },
        getLineAnchor : function($line) {
            var lineHandle = $line.lineType ? $line : this.diffView.getLineHandle($line);
            return new LineAnchor(
                this.options.anchor,
                lineHandle.lineType,
                lineHandle.lineNumber,
                lineHandle.fileType
            );
        },
        /**
         * Render the fileComments that were passed in to the current comment context.
         */
        renderFileComments: function() {
            var commitRange = this.options.anchor.toJSON().commitRange;
            this.$el.prepend(stash.feature.fileComments({
                comments: this.options.fileComments,
                commitRange: commitRange
            }));
        },
        /**
         * Add anchored comments to the current diff view.
         *
         * Filters out only the line comments and add them to the correct line based on their anchors.
         *
         * @param {Object} anchoredComments
         */
        addAnchoredComments: function() {
            var self = this;
            var diffView = this.diffView;

            var anchoredComments = this.options.lineComments;

            // Check if this is a set of comments with anchors.
            if (anchoredComments && anchoredComments[0] && !anchoredComments[0].anchor) {
                return;
            }

            /**
             * Group anchored comments by fileType and line
             * @param {Array} anchoredComments
             */
            function commentsByLine(anchoredComments) {
                return _.chain(anchoredComments)
                    .filter(function(comment) {
                        return !!(comment.anchor && comment.anchor.line);
                    })
                    .groupBy(function(comment) {
                        return (comment.anchor.fileType || '') + comment.anchor.line;
                    })
                    .value();
            }

            // Find the lineHandle for each line that needs commenting and add comment containers for that line.
            _.forEach(commentsByLine(anchoredComments), function(lineComments) {
                var anchor = lineComments[0].anchor;
                var handle = diffView.getLineHandle({
                    fileType:   anchor.fileType,
                    lineType:   anchor.lineType,
                    lineNumber: anchor.line
                });
                // Only try to add a comment if we get back a valid handle.
                if (handle) {
                    self.addCommentContainerForLine(handle, lineComments);
                }
            });
        },
        onFileCommentsResized : function() {
            this.trigger('fileCommentsResized');
        },
        onDiffChange : function(change) {
            if (change.type !== 'INITIAL' && change.type !== 'INSERT') {
                return;
            }

            if (change.type === 'INITIAL') {
                // if we have anchored line comments add them to the diff now.
                this.addAnchoredComments();
            }

            var diffView = this.diffView;
            var self = this;

            change.eachLine(function(data) {
                var line = data.line;
                var commentTriggerMarkup;
                var changedLine = line.lineType === 'ADDED' || line.lineType === 'REMOVED';
                var commentableLine = !data.attributes.expanded || changedLine;

                if (commentableLine && (self.options.allowCommenting && change.type === 'INITIAL')) {
                    commentTriggerMarkup = stash.feature.addCommentTrigger();
                } else {
                    commentTriggerMarkup = stash.feature.dummyCommentTrigger({ relevantContextLines: self.options.relevantContextLines });
                }

                if (data.handles.FROM) {
                    diffView.setGutterMarker(data.handles.FROM, self.getGutterId(), $(commentTriggerMarkup)[0]);
                }

                // For side-by-side also populate the other side.
                if (data.handles.TO && data.handles.FROM !== data.handles.TO) {
                    diffView.setGutterMarker(data.handles.TO, self.getGutterId(), $(commentTriggerMarkup)[0]);
                }

                // if there are comments on this line, add a container for them. This is for Unified Diff only
                if (line.commentIds) { // TODO (maybe) - rearrange for separated comment and diff response?
                    var lineComments = _.chain(line.commentIds).map(fn.lookup(self._commentsById)).filter(_.identity).value();

                    if (lineComments.length) {
                        self.addCommentContainerForLine(data.handles.FROM || data.handles.TO, lineComments);
                    }
                }

                //Restore line drafts if there are any that haven't been restored
                if (self.unrestoredDrafts.length && change.type === 'INITIAL') { //Context expansion will never have drafts to restore
                    _.chain(data.handles)
                        .compact()
                        .uniq()
                        .forEach(self.restoreDraftsForLine.bind(self));
                }
            });
        },
        /**
         * For a line (defined by a handle), find any matching drafts and restore them
         * @param {StashLineHandle} handle
         */
        restoreDraftsForLine: function(handle) {
            var lineAnchor = $.extend({
                line: handle.lineNumber,
                lineType: handle.lineType
            }, {
                //Intentionally using $.extend because it won't copy fileType if it's undefined
                fileType: handle.fileType
            });

            var lineDrafts = this.getUnrestoredDraftsForLine(lineAnchor);

            if (lineDrafts.length) {
                this._restoreDraftsToContainer(this.addCommentContainerForLine(handle), lineDrafts);
            }
        },
        /**
         * Helper function which restores the matched drafts to the given container and prunes them from the unrestoredDrafts list
         * @param {DiffCommentContainer} container
         * @param {Array} drafts
         * @private
         */
        _restoreDraftsToContainer: function(container, drafts) {
            _.forEach(drafts, container.restoreDraftComment.bind(container));

            //Remove these drafts from the pool of unrestored drafts. We won't ever retry so we optimistically remove all of them
            this.unrestoredDrafts = _.difference(this.unrestoredDrafts, drafts);
        },
        /**
         * Only restores file comment drafts and filters out new comments on views that don't allow commenting
         * Line comment restore is done in restoreDraftsForLine (called from onDiffChange)
         */
        restoreDrafts: function(){
            var self = this;

            if (!this.options.allowCommenting) {
                this.unrestoredDrafts = _.filter(this.unrestoredDrafts, function(draft){
                    //If this is a file comment activity, maintain edits and replies for file comments
                    //Otherwise filter out all drafts except for line edits and replies
                    return (draft.id || draft.parent) &&
                        (self.$el.is('.file-comment-activity') || draft.anchor.line);
                });
            }

            this.restoreDraftFileComments();
        },
        /**
         * Restore any draft file comments
         */
        restoreDraftFileComments: function(){
            var fileDrafts = _.reject(this.unrestoredDrafts, function(draft){
                return draft.anchor.line;
            });

            if (fileDrafts.length) {
                this._restoreDraftsToContainer(this.addCommentContainerForFile(), fileDrafts);
            }
        },
        /**
         * Given a line anchor, return all the unrestored drafts attached to that line
         * @param lineAnchor - {line, lineType, fileType} to compare against
         * @returns {Array} - Array of drafts or empty array
         */
        getUnrestoredDraftsForLine: function(lineAnchor) {
            var equalise = _.compose(
                    fn.partialRight(_.omit,'path', 'srcPath'),   //remove path and srcPath (we don't need them, they should always match)
                    this.unifyAnchorFileTypes);                  //and unify the fileTypes
            var isSameLineAnchor = _.isEqual.bind(_, equalise(lineAnchor));
            var matchesLineAnchor = _.compose(
                    isSameLineAnchor,   //Is the draft's anchor equal to the lineAnchor
                    equalise,           //After we unify the anchor file types and remove path & srcPath
                    fn.dot('anchor'));

            return _.filter(this.unrestoredDrafts, matchesLineAnchor);
        },
        /**
         * Treat equivalent fileTypes as equal across unified and SBS diff
         * @param {Object} anchor - Anchor containing (at least) the fileType and lineType
         * @returns {Object} - The modified anchor
         */
        unifyAnchorFileTypes: function(anchor) {
            //For context and removed lines, a fileType of 'FROM' should be considered equal to not supplying a fileType
            var fromShouldEqualNone = ((anchor.lineType === DiffSegmentTypes.CONTEXT ||
                anchor.lineType === DiffSegmentTypes.REMOVED) &&
                anchor.fileType === DiffFileTypes.FROM);
            //For added lines, a fileType of 'TO' should be considered equal to not supplying a fileType
            var toShouldEqualNone = (anchor.lineType === DiffSegmentTypes.ADDED &&
                anchor.fileType === DiffFileTypes.TO);


            if (fromShouldEqualNone || toShouldEqualNone) {
                return _.omit(anchor, 'fileType');
            }
            return anchor;
        },
        /**
         * Overrides CommentContext.prototype.clarifyAmbiguousDraftProps and adds a call to unifyAnchorFileTypes
         * @param {Object} originalDraft
         * @returns {Object} - The modified draft
         */
        clarifyAmbiguousDraftProps: function(originalDraft) {
            var draft = CommentContext.prototype.clarifyAmbiguousDraftProps.call(this, originalDraft);

            draft.anchor = this.unifyAnchorFileTypes(draft.anchor);

            return draft;
        },
        setDiffView : function(diffView) {
            if (this.diffView) {
                this.diffView.off('change',this.onDiffChange);
            }
            this.diffView = diffView;
            if (diffView) {
                this.diffView.on('change',this.onDiffChange);
            }
        }
    });
});
