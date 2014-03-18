define('feature/pull-request/pull-request-commits', [
    'jquery',
    'util/events',
    'util/navbuilder',
    'feature/commits/commits-table',
    'exports'
], function(
    $,
    events,
    navBuilder,
    CommitsTable,
    exports
) {
        var pullRequestId,
            commitsTable;

        function getCommitsUrlBuilder() {
            var builder = navBuilder
                .currentRepo()
                .pullRequest(pullRequestId)
                .commits();

            return builder;
        }

        function setKeyboardShortcuts(shouldEnable) {
            if (shouldEnable) {
                commitsTable.initShortcuts();
            } else {
                commitsTable.resetShortcuts();
            }


            var method = shouldEnable ? 'on' : 'off';

            events[method]('stash.keyboard.shortcuts.requestMoveToNextHandler',     commitsTable.bindMoveToNextHandler);
            events[method]('stash.keyboard.shortcuts.requestMoveToPreviousHandler', commitsTable.bindMoveToPreviousHandler);
            events[method]('stash.keyboard.shortcuts.requestOpenItemHandler',       commitsTable.bindOpenItemHandler);
            events[method]('stash.keyboard.shortcuts.requestToggleMergesHandler',   commitsTable.bindToggleMergesHandler);
        }

        exports.init = function(options){

            pullRequestId = options.pullRequest.getId();

            var $table = $(stash.feature.pullRequest.commits({
                repository : options.repository.toJSON(),
                commitsTableWebSections : options.commitsTableWebSections
            }));

            // HACK: We keep the table out of the DOM until it's fully initialized (for UX reasons).
            // HACK: To avoid multiple pages being loaded because of this, we suspend the commits table, and
            // HACK: resume once the table is in the DOM.
            // HACK: $fakeParent is required because paged-table adds a spinner as a sibling.
            var $fakeParent = $('<div />').append($table);

            commitsTable = new CommitsTable(getCommitsUrlBuilder, {
                target: $table,
                webSections : options.commitsTableWebSections,
                allCommitsFetchedMessage: stash_i18n('stash.web.pull-request.allcommitsfetched', 'No more commits in pull request')
            });

            // HACK: see note on $fakeParent above.
            $(options.el).append(commitsTable.$spinner);

            // HACK: see note on $fakeParent above.
            var promise = commitsTable.init({ suspended : true }).done(function() {
                $(options.el).prepend($fakeParent.children());
                commitsTable.resume();
            });

            setKeyboardShortcuts(true);

            return promise;
        };

        exports.reset = function() {
            setKeyboardShortcuts(false);
            commitsTable.destroy();
            commitsTable = null;
        };
    });