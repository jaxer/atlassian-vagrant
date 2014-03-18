define('layout/base', [
    'aui',
    'jquery',
    'util/events',
    'underscore',
    'util/navbuilder',
    'model/page-state',
    'model/stash-user',
    'widget/aui/dropdown',
    'widget/aui/form',
    'feature/repository/repository-search',
    'exports'
], function (
    AJS,
    $,
    events,
    _,
    nav,
    pageState,
    StashUser,
    dropdown,
    form,
    RepositorySearch,
    exports
) {

    "use strict";

    // Only check for debugging params when there is a querystring.
    if (location.search) {
        var uri = nav.parse(location.href),
            eveSelector = uri.getQueryParamValue('eve');

        // This is really handy for debugging the event lifecycle of the page, pass ?eve=selector to use (makes most sense with wildcards)
        // Logs to the console the event name, the 'this' context and the arguments passed to the handler.
        eveSelector && events.on(eveSelector, function(){ console.log([events.name()], this, arguments); });
    }

    function initUserPageState(currentUserJson) {
        if (currentUserJson) {
            // TODO: Add this to $ij? Means InjectedDataFactory relies on permissionService
            currentUserJson.isAdmin = !!$('#header').find('a.admin-link').length;
            pageState.setCurrentUser(new StashUser(currentUserJson));
        }
    }

    exports.onReady = function(currentUserJson) {
        initUserPageState(currentUserJson);

        dropdown.onReady();
        form.onReady();

        // for use by keyboard-shortcuts.js, but could be useful elsewhere.
        // I realize this is the wrong place for an encodeURIComponent, but it _should_ do nothing, except for when
        // our build leaves a ${commitHash} here instead of a hex number.
        AJS.params["build-number"] = encodeURIComponent($('#product-version').attr('data-system-build-number'));


        var $window = $(window);

        var debouncedResize = _.debounce(function() {
            events.trigger('window.resize.debounced', $window, $window.width(), $window.height());
        }, 200);
        $window.on("resize", debouncedResize);

        var throttledScroll = _.throttle(function() {
            events.trigger('window.scroll.throttled', $window, $window.scrollTop());
        }, 25);
        $window.on('scroll', throttledScroll);

        var $repositorySearch = $('#repository-search');
        new RepositorySearch($repositorySearch, $repositorySearch.closest('.repository-search-trigger'));
    };
});
