define('feature/file-content/diff-message', [
    'aui',
    'util/deprecation',
    'util/events',
    'exports'
], function(
    AJS,
    deprecate,
    events,
    exports
) {

    'use strict';

    /**
     * Render a message explaining that there is a conflict within this file.
     *
     * @param {jQuery} $container Where to place the message
     * @param {FileChange} fileChange a model representing a changed file between two revisions and possibly two different paths.
     */
    function renderConflict($container, fileChange) {
        $container.append(stash.feature.fileContent.diffError.conflict({
            titleContent : AJS.escapeHtml(fileChange.getConflict().getConflictMessage())
        }));
    }

    /**
     * Render a message explaining that there is no content changed. Fires a global event.
     *
     * @param {jQuery} $container Where to place the message
     * @param {Object} diff JSON representing a single diff, as found within the Stash /diff REST resource (as a single item in the returned array).
     * @param {FileChange} fileChange a model representing a changed file between two revisions and possibly two different paths.
     */
    function renderEmptyDiff($container, diff, fileChange) {
        deprecate.triggerDeprecated('stash.feature.diff-view.render.emptydiff', window, 'stash.feature.fileContent.emptyDiffShown', '2.10', '3.0');

        $container.append(stash.feature.fileContent.diffError.emptyDiff({
            fileChangeType: fileChange.getType()
        }));

        var sinceRev = fileChange.getCommitRange().getSinceRevision();
        var untilRev = fileChange.getCommitRange().getUntilRevision();

        events.trigger('stash.feature.fileContent.emptyDiffShown', {
            containerEl : $container.get(0),
            sourcePath : diff.source,
            sinceRevision : sinceRev && sinceRev.toJSON(),
            destinationPath : diff.destination,
            untilRevision: untilRev && untilRev.toJSON()
        });
    }

    /**
     * Display any generic errors returned in place of a diff from Stash REST resources.
     *
     * @param {jQuery} $container Where to place the message
     * @param {Object} data JSON shaped like a Stash error REST response.
     */
    function renderErrors($container, data) {

        var errors = data && data.errors && data.errors.length ? data.errors : [{
            message : stash_i18n('stash.web.repo.diff.unknown.error', 'An unknown error has occurred')
        }];

        $container.append(_.map(errors, stash.feature.fileContent.diffError.generic).join(''));
    }

    /**
     * Display a message that the diff is too large to be displayed.
     *
     * @param {jQuery} $container Where to place the message
     * @param {Object} diff JSON representing a single diff, as found within the Stash /diff REST resource (as a single item in the returned array).
     * @param {FileChange} fileChange a model representing a changed file between two revisions and possibly two different paths.
     * @param {boolean}
     */
    function renderTooLargeDiff($container, diff, fileChange, sideBySideDiffEnabled) {
        var commitRange = fileChange.getCommitRange();
        var isPR = commitRange.getPullRequest();

        $container.append(stash.feature.fileContent.diffError.tooLargeDiff({
            filePath : diff.destination.toString,
            revisionId : !isPR && commitRange.getUntilRevision() && commitRange.getUntilRevision().getId(),
            parentRevisionId : !isPR && commitRange.getSinceRevision() && commitRange.getSinceRevision().getId(),
            sideBySideDiffEnabled: sideBySideDiffEnabled
        }));
    }

    exports.renderConflict = renderConflict;
    exports.renderEmptyDiff = renderEmptyDiff;
    exports.renderErrors = renderErrors;
    exports.renderTooLargeDiff = renderTooLargeDiff;
});
