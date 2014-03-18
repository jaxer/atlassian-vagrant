define('feature/repository/branch-table-pull-requests', [
    'jquery',
    'util/dom-event',
    'feature/pull-request-list-dialog',
    'exports'
], function (
    $,
    domEventUtil,
    PullRequestDialog,
    exports
) {

    'use strict';

    exports.onReady = function () {
        $('.branch-list-panel').on('click', '.pull-request-list-trigger', function (e) {
            if (e.target.tagName === 'A' && !domEventUtil.openInSameTab(e)) {
                // The user is attempting to open the PR in a separate tab/window.
                // Let the browser handle the click event natively
                return;
            }
            e.preventDefault();
            var branchId = $(this).closest('[data-branch-id]').attr('data-branch-id');
            PullRequestDialog.showFor('outgoing', branchId, 'all', 'newest');
        });

        $('.pull-request-list-trigger').tooltip({
            gravity: 'n',
            live: true
        });
    };
});

AJS.$(document).ready(function () {
    require('feature/repository/branch-table-pull-requests').onReady();
});