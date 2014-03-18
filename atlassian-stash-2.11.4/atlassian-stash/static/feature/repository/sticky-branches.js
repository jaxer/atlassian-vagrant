define('feature/repository/sticky-branches', [
    'jquery',
    'util/client-storage',
    'util/events',
    'util/navbuilder',
    'util/text',
    'exports'
], function(
    $,
    clientStorage,
    events,
    nav,
    textUtil,
    exports
    ) {

    var $fileBrowseLink;
    var $commitsLink;
    var $branchesLink;

    exports.onReady = function(){
        var pageUrl = nav.parse(location.href),
            browseUrl = nav.currentRepo().browse().build(),
            commitsUrl = nav.currentRepo().commits().build(),
            isBrowsePage = pageUrl.path().indexOf(browseUrl) === 0, //treat all sub-pages (folders and files) like the browse page
            isCommitsPage = pageUrl.path() === commitsUrl,
            customRef = isBrowsePage ? pageUrl.getQueryParamValue('at') :
                        isCommitsPage ? pageUrl.getQueryParamValue('until') :
                        undefined,
            resetIfNoCustomRef = isBrowsePage || isCommitsPage,
            branchSessionKey = clientStorage.buildKey('current-branch', 'repo'),
            sessionRef = clientStorage.getSessionItem(branchSessionKey);

        $fileBrowseLink = $('#repository-nav-files');
        $commitsLink = $('#repository-nav-commits');
        $branchesLink = $('#repository-nav-branches');

        if (customRef) {
            customRef = decodeURIComponent(customRef);

            if (customRef !== sessionRef) {
                //update the stored ref in the session
                clientStorage.setSessionItem(branchSessionKey, customRef);
            }

            addRefToNavLinks(customRef);
        } else if (resetIfNoCustomRef) {
            // If we are on the browse or commits page, and the user visits without a ref specified,
            // even if we have a ref in the session storage, reset to the default branch and clear the session storage
            // Prevents inconsistency between nav links and branch selector (branch selector would have default branch,
            // but the nav links would link to the session ref)
            clientStorage.removeSessionItem(branchSessionKey);
        } else if (sessionRef) {
            // If we have a ref stored in the session, use it
            addRefToNavLinks(sessionRef);
        }

        events.on('stash.layout.branch.revisionRefChanged', function(revisionRef) {
            if (revisionRef) {
                if (!revisionRef.getIsDefault()) {
                    var refId = revisionRef.getId();

                    addRefToNavLinks(refId);
                    clientStorage.setSessionItem(branchSessionKey, refId);
                } else {
                    removeRefFromNavLinks();
                    clientStorage.removeSessionItem(branchSessionKey);
                }
            }
        });

        // Eve is not greedy with its wild card matching. We are assuming the first part
        // is page|feature|widget|layout and the second part is the name of the component
        events.on('stash.*.*.revisionRefRemoved', function(ref) {
            // This is definitely _not_ perfect. This can potentially incorrectly
            // match when the suffix. Ideally we would be comparing ids but often
            // branchSessionKey stores a displayId. However .refRemoved is not a
            // common action so it is safer to just clear the history.
            if (textUtil.endsWith(ref.id, clientStorage.getSessionItem(branchSessionKey))) {
                removeRefFromNavLinks();
                clientStorage.removeSessionItem(branchSessionKey);
            }
        });
    };

    function addRefToNavLinks(ref) {
        if (ref) {
            ref = encodeURIComponent(ref);

            $fileBrowseLink.attr('href', nav.parse($fileBrowseLink.attr('href')).replaceQueryParam('at', ref));
            $commitsLink.attr('href', nav.parse($commitsLink.attr('href')).replaceQueryParam('until', ref));
            $branchesLink.attr('href', nav.parse($branchesLink.attr('href')).replaceQueryParam('base', ref));
        } else {
            removeRefFromNavLinks();
        }
    }

    function removeRefFromNavLinks() {
        $fileBrowseLink.attr('href', nav.parse($fileBrowseLink.attr('href')).deleteQueryParam('at'));
        $commitsLink.attr('href', nav.parse($commitsLink.attr('href')).deleteQueryParam('until'));
        $branchesLink.attr('href', nav.parse($branchesLink.attr('href')).deleteQueryParam('base'));
    }

});