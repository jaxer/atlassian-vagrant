define('layout/base/menu/recent-repos', [
    'jquery',
    'util/ajax',
    'util/navbuilder',
    'util/html',
    'util/events',
    'exports'
], function(
    $,
    ajax,
    nav,
    html,
    events,
    exports
) {
    exports.initMenu = function(menuTriggerId) {

        var $menu = $('#' + html.sanitizeId($('#' + menuTriggerId).attr('aria-owns'))).addClass('recent-repositories-menu'),
        $repoList = $menu.find('.recent-repositories-section ul'),
        $loading = $(stash.layout.menu.loadingRecentReposMenuItem());

        $repoList.append($loading);

        var fetchRecentRepos = function() {
            ajax.rest({
                url: nav.rest().profile().recent().repos().withParams({
                    avatarSize: stash.widget.avatarSizeInPx({ size: 'xsmall' })
                }).build(),
                statusCode : {
                    '*' : function() {
                        return false; // don't show any error messages
                    }
                }
            }).done(function (data) {
                if (data && data.size) {
                    var sortedValues = data.values;
                    sortedValues.sort(function(repo1, repo2) {
                        return repo1.project.name.localeCompare(repo2.project.name) ||
                               repo1.name.localeCompare(repo2.name);
                    });

                    $repoList.append($(stash.feature.repository.menuItems({repos: sortedValues})));
                } else {
                    $repoList.append($(stash.layout.menu.noRecentReposMenuItem()));
                }
                // Fire an event with the recent repository data so that other parts of Stash have access to it
                events.trigger('stash.feature.repositories.recent.loaded', this, data);
            }).fail(function () {
                $repoList.append($(stash.layout.menu.errorLoadingRecentReposMenuItem()));
            }).always(function () {
                $loading.remove();
            });
        };

        //Load only once all other resources have loaded
        $(window).on('load', fetchRecentRepos);
    };
});
