define('page/commits', [
    'memoir',
    'model/revision-reference',
    'util/events',
    'util/navbuilder',
    'feature/commits/commits-table',
    'exports'
], function(
    memoir,
    RevisionReference,
    events,
    navBuilder,
    CommitsTable,
    exports
) {
        var atRevisionRef,
            commitsTable;

        function getCommitsUrlBuilder(atRevRef) {
            atRevRef = atRevRef || atRevisionRef;
            var builder = navBuilder.currentRepo().commits();
            if (!atRevRef.isDefault()) {
                builder = builder.withParams({ until : atRevRef.getId() });
            }
            return builder;
        }

        function bindKeyboardShortcuts() {
            commitsTable.initShortcuts();

            events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
                keyboardShortcuts.enableContext('commits');
            });

            events.on('stash.keyboard.shortcuts.requestMoveToNextHandler',     commitsTable.bindMoveToNextHandler);
            events.on('stash.keyboard.shortcuts.requestMoveToPreviousHandler', commitsTable.bindMoveToPreviousHandler);
            events.on('stash.keyboard.shortcuts.requestOpenItemHandler',       commitsTable.bindOpenItemHandler);
            events.on('stash.keyboard.shortcuts.requestToggleMergesHandler',   commitsTable.bindToggleMergesHandler);

            var disableOpenHandler = function () {
                events.trigger('stash.keyboard.shortcuts.disableOpenItemHandler');
            };
            var enableOpenHandler = function () {
                events.trigger('stash.keyboard.shortcuts.enableOpenItemHandler');
            };
            events.on('stash.widget.branchselector.dialogShown', disableOpenHandler);
            events.on('stash.widget.branchselector.dialogHidden', enableOpenHandler);
            events.on('stash.layout.branch.actions.dropdownShown', disableOpenHandler);
            events.on('stash.layout.branch.actions.dropdownHidden', enableOpenHandler);

        }

        exports.onReady = function(atRevisionRefJSON) {
            atRevisionRef = new RevisionReference(atRevisionRefJSON);
            commitsTable = new CommitsTable(getCommitsUrlBuilder);
            commitsTable.init();

            events.on('stash.layout.branch.revisionRefChanged', function(newAtRevisionRef) {
                if (atRevisionRef !== newAtRevisionRef) {
                    memoir.pushState(newAtRevisionRef.toJSON(), null, getCommitsUrlBuilder(newAtRevisionRef).build());
                }
            });

            events.on('memoir.changestate', function(e) {
                var state = e.state;
                if (state) {
                    atRevisionRef = new RevisionReference(state);
                    commitsTable.update();
                    events.trigger("stash.page.commits.revisionRefChanged", null, atRevisionRef);
                }
            });

            bindKeyboardShortcuts();

            memoir.initialState(atRevisionRef.toJSON());
        };
    });
