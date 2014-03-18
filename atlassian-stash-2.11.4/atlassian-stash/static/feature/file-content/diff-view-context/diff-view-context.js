define('feature/file-content/diff-view/diff-view-context', [
    'util/deprecation',
    'feature/file-content/diff-view-context'
], function(deprecate, options) {

    deprecate.getMessageLogger(
        'feature/file-content/diff-view/diff-view-context',
        'feature/file-content/diff-view-context', '2.11', '3.0')();

    return options;
});

define('feature/file-content/diff-view-context', [
    'jquery',
    'underscore',
    'util/ajax',
    'util/dom-event',
    'util/navbuilder',
    'feature/file-content/diff-view-context/diff-view-context-internal',
    'exports'
], function(
    $,
    _,
    ajax,
    domEventUtil,
    navBuilder,
    diffViewContext,
    exports) {

    var isMac = navigator.platform.indexOf('Mac') !== -1;
    var tooltip = isMac ?
        stash_i18n('stash.web.diffview.showmore.tooltip.cmd', 'Click to reveal a few more lines\nCmd + Click to reveal them all') :
        stash_i18n('stash.web.diffview.showmore.tooltip.ctrl', 'Click to reveal a few more lines\nCtrl + Click to reveal them all');

    var contextParam = navBuilder.parse(location.href).getQueryParamValue('context');

    var DEFAULT_OPTIONS = {
        maxLimit: $.browser.msie ? 1000 : 5000,
        maxContext: (contextParam && parseInt(contextParam, 10)) || 10
    };

    function createSeparatedHunkHtml(lineStart, lineEnd, destOffset, changeType, isBelow, isAbove) {
        return (isBelow || isAbove) ? stash.feature.fileContent.hunkSeparator({
            tooltip: tooltip,
            lineStart: lineStart, lineEnd: lineEnd, destOffset: destOffset, changeType: changeType, isBelow: isBelow, isAbove: isAbove
        }) : '';
    }

    /**
     * Adds a listeners for context breaks so they can be expanded by a user click.
     *
     * @param {jQuery} $diffContent - container with all the diff content
     * @param {FileChange} fileChange - object with details about the current file
     * @param {function} expansionCallback - function to be used to render expanded contexts
     */
    exports.attachExpandContext = function($diffContent, fileChange, expansionCallback) {
        // Use a live event so new skipped containers will automatically have the same behaviour
        return $diffContent.on('click', '.skipped-container:not(.loading)', function (e) {
            e.preventDefault();

            var $container = $(e.currentTarget);
            // Stop events from firing twice
            $container.addClass('loading');
            // Replace the text so it will be centered vertical, but make sure it doesn't jump
            $container.find('.showmore span').html("&nbsp;");
            var $spinner = $container.find('.showmore').spin('small');

            var changeType = $container.data('change-type');

            function browse(start, limit) {
                var diff = fileChange.getDiff() && fileChange.getDiff().attributes || {};
                return ajax.rest({
                    statusCode: {
                        '200': function (xhr, testStatus, errorThrown, data) {
                            // This is about as dodgy as you get.
                            // We return 200 when the paging fails, which can happen if you're at the end of the
                            // file but don't know it and it's your first click.
                            // Look for the request line number in the error message and ignore it by returning
                            // a fake promise that has no lines.
                            // The number may also contain commas (eg. 1,345)
                            if (data && data.message && data.message.replace(/,/g, '').indexOf(' ' + start + ' ') > 0) {
                                return {promise: function () {
                                    return {lines: []};
                                }};
                            }
                        }
                    },
                    url: navBuilder
                        .currentRepo()
                        .browse()
                        // For pull requests we are comparing the _effective_ diff with the target branch, we don't actually
                        // care about the destination. In the worse case the target branch has a file renamed, in which case
                        // we want the contents of the source file at the since revision, which we can't do without the 'toHash'
                        // TODO Some of this is redundant - please remove when STASHDEV-4033 is fixed.
                        .path((fileChange.getSrcPath() && fileChange.getSrcPath().toString() !== "") ? fileChange.getSrcPath() : fileChange.getPath())

                        // The diff object is _only_ available on activity diffs, and contains the correct effective 'toHash'
                        // Otherwise fallback to the sinceRevision
                        // This is flipped if the file is added and therefore won't exist on the source
                        // Technically this is only a problem for pull requests as we only show the comment context,
                        // unlike the diff which will (by definition) be the entire file
                        .at(diffViewContext.isAdded(changeType) ? diff.toHash || fileChange.getCommitRange().getUntilRevision().getId()
                            : diff.fromHash || fileChange.getCommitRange().getSinceRevision().getId()
                        )
                        .withParams({start: start, limit: limit})
                        .build()
                    // Removed arguments other than the first (ie data), otherwise we return an array of the 3 resulting values in an array
                }).then(_.identity).always(function() {
                        $spinner.spinStop();
                    }).fail(function() {
                        // So the user can click on the separator again if the server went down
                        $container.removeClass('loading');
                    });
            }

            var offset = $container.data('dest-offset');
            // Ctrl-click should load everything
            var maxContext = domEventUtil.isCtrlish(e) ? DEFAULT_OPTIONS.maxLimit - 1 : DEFAULT_OPTIONS.maxContext;
            var startIndex = $container.data('line-start') - 1;
            var endIndex = $container.data('line-end') - 1;

            diffViewContext.fetchContext(startIndex, endIndex, browse, maxContext, DEFAULT_OPTIONS)
                .then(diffViewContext.toHunks(offset, changeType))
                .then(_.bind(expansionCallback, null, fileChange, $container));
        });
    };

    exports.getSeparatedHunkHtml = function(hunks, fileChangeType) {
        return diffViewContext.getSeparatedHunkHtml(hunks, fileChangeType, createSeparatedHunkHtml);
    };
});

