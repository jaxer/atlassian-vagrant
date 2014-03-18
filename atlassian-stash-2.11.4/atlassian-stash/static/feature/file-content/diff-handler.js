//noinspection JSValidateTypes
/**
 * Register a handler of diff files that will request diff information and call out to the correct diff view for the response.
 * It may show a binary diff, a textual diff, or an error message.
 *
 * The register call is pulled out and made synchronous to avoid race conditions about when the require callback is called.
 */
define('feature/file-content/diff-handler', [
    'jquery',
    'util/ajax',
    'util/navbuilder',
    'util/promise',
    'model/file-change',
    'model/file-change-types',
    'model/file-content-modes',
    'feature/comments',
    'feature/file-content/binary-view',
    'feature/file-content/diff-message',
    'feature/file-content/request-diff',
    'feature/file-content/diff-handler/diff-handler-internal',
    'feature/file-content/diff-view-options',
    'feature/file-content/binary-diff-view',
    'feature/file-content/side-by-side-diff-view',
    'feature/file-content/unified-diff-view',
    'exports'
], function (
    $,
    ajax,
    navBuilder,
    promiseUtil,
    FileChange,
    FileChangeTypes,
    FileContentModes,
    comments,
    binaryView,
    diffMessage,
    requestDiff,
    diffHandlerInternal,
    DiffViewOptions,
    BinaryDiffView,
    SideBySideDiffView,
    UnifiedDiffView,
    exports
) {

    "use strict";

    /**
     * Return a comment context to display and interact with the given data.
     * Will return null if the commentMode is NONE.
     *
     * @param {Object} options - file handler options
     * @param {Object} data - diff REST data
     * @param {Object} commentData - comment REST data
     * @returns {?CommentContext}
     */
    function getBoundCommentContext(options, data, commentData) {
        var $container = options.$container;
        var fileChange = new FileChange(options.fileChange);
        if (options.commentMode !== comments.commentMode.NONE) {
            // collate our comments from the two sources
            var commentsByType = commentData ?
                _.groupBy(commentData.values, function(comment) {
                    return comment.anchor.line ? 'line' : 'file';
                }) :
            {
                line : data.lineComments || [],
                file : data.fileComments || []
            };

            return comments.bindContext($container, new comments.DiffAnchor(fileChange), {
                lineComments: commentsByType.line,
                fileComments: commentsByType.file,
                commentMode: options.commentMode,
                relevantContextLines: options.relevantContextLines
            });
        }
        return null;
    }

    /**
     * Return the main view that will be used to display content
     * @param {Object} options - file handler options
     * @param {Object} data - diff REST data
     * @param {CommentContext} [commentContext] - the comment context, if any
     * @param {boolean} shouldShowSideBySideDiff - whether a side-by-side or unified diff is preferred.
     * @returns {{extraClasses: string?, destroy: Function?}} - the view
     */
    function getMainView(options, data, commentContext, shouldShowSideBySideDiff) {
        var $container = options.$container;
        var fileChange = new FileChange(options.fileChange);
        if (binaryView.shouldRenderBinary(data)) {
            return new BinaryDiffView(data, options);
        }

        if (!data || !data.hunks || !data.hunks.length) {
            diffMessage.renderEmptyDiff($container, data, fileChange);
            return {
                extraClasses : 'empty-diff message-content'
            };
        }

        if (data.hunks[data.hunks.length - 1].truncated) {
            diffMessage.renderTooLargeDiff($container, data, fileChange, shouldShowSideBySideDiff);
            return {
                extraClasses : 'too-large-diff message-content'
            };
        }

        var DiffViewConstructor =  shouldShowSideBySideDiff ? SideBySideDiffView : UnifiedDiffView;
        var diffView = new DiffViewConstructor(data, $.extend({commentContext: commentContext}, options));

        if (commentContext) {
            commentContext.setDiffView(diffView);
        }

        diffView.init();

        return diffView;
    }

    exports.handler = function(options) {
        var DEFAULT_RELEVANT_CONTEXT = 10; // if it is not available from the server for some reason
        var infiniteContext = 10000; // not actually infinite, but sufficiently large.
        var isDiff = options.contentMode === FileContentModes.DIFF;
        var $container = options.$container;
        var $sideBySideDiffTypeItem = $('.diff-type-options .aui-dropdown2-radio[data-value="side-by-side"]');
        var fileChange = new FileChange(options.fileChange);
        var fileChangeType = fileChange.getType();
        var fileSupportsSideBySideView = !(fileChangeType === FileChangeTypes.ADD || fileChangeType === FileChangeTypes.DELETE || options.isExcerpt);
        var browserSupportsSideBySideView = !($.browser.msie && parseInt($.browser.version, 10) < 9);
        // A function because fileSupportsSideBySideView can change after the data has returned
        function shouldShowSideBySideDiff() {
            return DiffViewOptions.get('diffType') === 'side-by-side' && browserSupportsSideBySideView && fileSupportsSideBySideView;
        }

        options.withComments = options.commentMode !== comments.commentMode.NONE;

        // For Side By Side diff set some custom options
        if (shouldShowSideBySideDiff()) {
            // we want to show all the context
            options.contextLines = infiniteContext;
            // don't pull in comments so the request can be cached
            options.withComments = false;
        }

        /**
         * Get the anchored comments for a diff. It will make an AJAX request to fetch all comments for a given
         * file (based on options.fileChange) and call the appropriate comment-context methods.
         *
         * @param {Object} options
         * @returns {Promise}
         */
        function getAnchoredComments(options) {

            var fileChange = new FileChange(options.fileChange);
            var repo = fileChange.getRepository();
            var commitRange = fileChange.getCommitRange();

            var builder = navBuilder
                .rest()
                .project(repo.getProject().getKey())
                .repo(repo.getSlug());

            // Grab the pullrequest id or the commitrange
            if (commitRange.getPullRequest()) {
                builder = builder.pullRequest(commitRange.getPullRequest().getId());
            } else {
                builder = builder.commit(commitRange);
            }

            var commentsUrl = builder
                .comments()
                .withParams({
                    avatarSize: stash.widget.avatarSizeInPx({ size: options.avatarSize || 'medium' }),
                    path: options.fileChange.path.toString(),
                    markup: true
                })
                .build();

            var xhr = ajax.rest({
                url: commentsUrl,
                statusCode : options.statusCode || ajax.ignore404WithinRepository()
            });

            var piped = xhr.then(function(data) {
                if (data.errors && data.errors.length) {
                    return $.Deferred().rejectWith(this, [this, null, null, data]);
                }

                return data;
            });

            return piped.promise(xhr);
        }

        // The comment getter can be a NOOP by default. For SBS it will point to a function that gets the comments.
        var requestComments = shouldShowSideBySideDiff() ? getAnchoredComments : $.noop;

        // Make the requests and wrap them in a promise
        var _requestPromises = _.compact([requestDiff(fileChange, options), requestComments(options)]);
        var requestPromise = promiseUtil.whenAbortable.apply(promiseUtil, _requestPromises);

        /**
         * Some side-by-side specific checks that modify the menu
         */
        function updateSideBySideMenu() {
            // If we can have a side-by-side view and it's not disabled, remove the
            // disabled class from the menu item
            if (browserSupportsSideBySideView && fileSupportsSideBySideView) {
                $sideBySideDiffTypeItem.removeClass('disabled');
                return;
            }

            // Add a tooltip to explain why side-by-side is disabled for the current browser.
            if (!browserSupportsSideBySideView) {
                $sideBySideDiffTypeItem.tooltip({
                    gravity: 'e',
                    delayIn: 0,
                    title: 'data-ie8-compatibility'
                });
            } else if (!fileSupportsSideBySideView) {
                //If side-by-side is not disabled for the current browser, but is disabled for the current file,
                //add a tooltip explaining why.
                $sideBySideDiffTypeItem.tooltip({
                    gravity: 'e',
                    delayIn: 0,
                    title: 'data-file-type-compatibility'
                });
            }
        }

        /**
         * Success Callback.
         * Called when both the Diff and Comments are successfully fetched.
         *
         * @param {Object} data - Diff data
         * @param {Object} [commentData] - Comment data
         * @returns {*}
         */
        function requestSuccessCallback(data, commentData) {

            // When displaying on file view we don't know if the file is added/removed
            fileSupportsSideBySideView = fileChangeType ? fileSupportsSideBySideView : !diffHandlerInternal.isAddedOrRemoved(data);

            updateSideBySideMenu();

            options.relevantContextLines = options.relevantContextLines || DEFAULT_RELEVANT_CONTEXT;

            if (fileChange.getConflict()) {
                diffMessage.renderConflict($container, fileChange);
            }

            var commentContext = getBoundCommentContext(options, data, commentData);
            var mainView = getMainView(options, data, commentContext, shouldShowSideBySideDiff());

            return {
                extraClasses: mainView && mainView.extraClasses,
                destroy : function() {
                    if (commentContext) {
                        commentContext.destroy();
                    }
                    if (mainView && mainView.destroy) {
                        mainView.destroy();
                    }
                }
            };
        }

        /**
         * Failure callback to execute when getting the diff or comments fails.
         * @param xhr
         * @param textStatus
         * @param errorThrown
         * @param data
         * @returns {Promise}
         */
        function requestFailureCallback(xhr, textStatus, errorThrown, data) {
            if (errorThrown === 'abort') {
                return $.Deferred().resolve();
            }
            diffMessage.renderErrors($container, data);
            return $.Deferred().resolve({ extraClasses : 'diff-error message-content' });
        }

        return isDiff && requestPromise.thenAbortable(requestSuccessCallback, requestFailureCallback);

    };
});

require('feature/file-content/diff-view-options-panel').init();

require('stash/api/feature/files/file-handlers').register({
    weight: 5000,
    handle: function(options) {
        return require('feature/file-content/diff-handler').handler.apply(this, arguments);
    }
});
