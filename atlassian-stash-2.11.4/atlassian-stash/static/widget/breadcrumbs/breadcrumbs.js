define('widget/breadcrumbs', [
    'jquery',
    'memoir',
    'util/dom-event',
    'util/events',
    'util/navbuilder',
    'model/page-state'
], function(
    $,
    memoir,
    domEventUtil,
    events,
    navBuilder,
    pageState) {

    'use strict';

    function Breadcrumbs(containerSelector) {
        this.$container = $(containerSelector);
        if (memoir.nativeSupport()) {
            var self = this;
            this.$container.on('click', 'a', function(e) {
                if (domEventUtil.openInSameTab(e)) {
                    events.trigger('stash.widget.breadcrumbs.urlChanged', self, $(this).attr("href"));
                    e.preventDefault();
                }
            });
        }
    }

    var browseNavBuilder = navBuilder.currentRepo().browse(),
        browsePath = function(pathComponents, revisionReference) {
            if (!revisionReference.isDefault()) {
                return browseNavBuilder.path(pathComponents).at(revisionReference.getId()).build();
            } else {
                return browseNavBuilder.path(pathComponents).build();
            }
        };

    function createBreadcrumbData(revisionReference, pathComponents) {
        var pathSeed = [],
            breadcrumbParts = _.map(pathComponents, function (part) {
                pathSeed = pathSeed.slice(0); //shallow copy
                pathSeed.push(part);
                return {
                    text: part,
                    url: browsePath(pathSeed, revisionReference)
                };
            });

        //prepend repository link
        breadcrumbParts.unshift({
            text: pageState.getRepository().getName(),
            url: browsePath([], revisionReference)
        });

        return breadcrumbParts;
    }
    
    Breadcrumbs.prototype.update = function(revisionReference, path, isDirectory) {
        this.$container.empty().append(
            stash.widget.breadcrumbs.crumbs({
                'pathComponents': createBreadcrumbData(revisionReference, path.getComponents()),
                'trailingSlash': isDirectory
            })
        );
    };

    return Breadcrumbs;
});
