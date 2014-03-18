/** @deprecated */
define('page/util/pageUtil', [
    'jquery',
    'util/deprecation',
    'exports'
],
/** @deprecated */
function(
    $,
    deprecate,
    exports) {

    function getPageData(role) {
        return $("#content").attr("data-" + role);
    }

    /** @deprecated */
    exports.getPageData = getPageData;

    /** @deprecated */
    exports.getPullRequestId = function() {
        return getPageData('pullrequestid');
    };

    /** @deprecated */
    exports.getPullRequestVersion = function() {
        return getPageData("pullrequestVersion");
    };

    /** @deprecated */
    exports.getRepoSlug = function () {
        return getPageData("reposlug");
    };

    /** @deprecated */
    exports.getRepoName = function () {
        return getPageData("reponame");
    };

    /** @deprecated */
    exports.getProjectName = function () {
        return getPageData("projectname");
    };

    /** @deprecated */
    exports.getProjectKey = function () {
        return getPageData("projectkey");
    };

    /** @deprecated */
    exports.getCurrentUsername = function() {
        return $('#current-user').attr('data-username');
    };

    /** @deprecated */
    exports.getCurrentUser = function() {
        var $currentUser = $('#current-user');
        return {
            name: $currentUser.attr('data-username'),
            displayName: $currentUser.attr('data-displayname'),
            avatarUrl: $currentUser.attr('data-avatarurl-small'),
            emailAddress: $currentUser.attr('data-emailaddress')
        };
    };

    /** @deprecated */
    exports.isCurrentUserAdmin = function() {
        return !!$('#header').find('.global a.admin-link').length;
    };

    deprecate.obj(exports, 'page/util/pageUtil::', 'model/page-state::', '2.0', '3.0');
});
