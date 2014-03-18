define('page/branches', [
    'jquery',
    'memoir',
    'util/ajax',
    'util/events',
    'util/navbuilder',
    'model/revision-reference',
    'feature/repository/branch-table',
    'exports'
], function (
    $,
    memoir,
    ajax,
    events,
    navBuilder,
    RevisionReference,
    BranchTable,
    exports) {

    'use strict';

    function getBranchListUrl(ref) {
        return navBuilder.currentRepo().branches(ref).build();
    }

    function invalidBaseRefHandler() {
        // reload to show a full page error message
        window.location.reload();
        // return an empty deferred to skip _all_ error handling except this one
        // (if returns true -> default REST error handling, if returns false -> default PagedTable error handling)
        return $.Deferred();
    }

    function bindBaseBranch(branchTable) {
        events.on('stash.page.branches.revisionRefRemoved', function (deletedRef) {
            if (!branchTable.isCurrentBase(deletedRef)) {
                branchTable.remove(deletedRef);
            } else {
                // if the current base ref was deleted, perform a full page pop
                // to reset the branch list to the default branch
                window.location = getBranchListUrl();
            }
        });
        events.on('stash.layout.branch.revisionRefChanged', function(selectedRef) {
            selectedRef = selectedRef.toJSON();
            memoir.pushState(selectedRef, null, getBranchListUrl(selectedRef));
        });

        events.on('memoir.changestate', function(e) {
            var selectedRef = e.state;
            if (selectedRef) {
                branchTable.update(selectedRef);
                events.trigger('stash.page.branches.revisionRefChanged', null, new RevisionReference(selectedRef));
            }
        });
    }

    function bindShortcuts(branchTable) {
        branchTable.initShortcuts();

        events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
            keyboardShortcuts.enableContext('branch-list');
        });
    }

    exports.onReady = function (containerSelector, branchTableId, repository, baseRef) {
        var $container = $(containerSelector);
        $container.append(stash.feature.repository.branchTable({
            repository: repository,
            baseRef: baseRef,
            id: branchTableId,
            filterable: false // The branch table is filterable but the filter is not in the default location
        }));
        var branchTable = new BranchTable({
            target: '#branch-list',
            filter: 'input[data-for="branch-list"]',
            statusCode: ajax.ignore404WithinRepository(invalidBaseRefHandler)
        }, baseRef);

        branchTable.init();

        bindBaseBranch(branchTable);
        bindShortcuts(branchTable);

    };
});