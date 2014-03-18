define('layout/files', [
    'util/events',
    'model/path',
    'model/revision-reference',
    'model/page-state',
    'widget/breadcrumbs',
    'exports'
], function(events, Path, RevisionReference, pageState, Breadcrumbs, exports) {

    exports.onReady = function(pathComponents,
                               atRevision,
                               breadcrumbsSelector,
                               isDirectory) {

        pageState.setFilePath(new Path(pathComponents));

        var currentRevisionRef = new RevisionReference(atRevision);
        var breadcrumbs = new Breadcrumbs(breadcrumbsSelector);

        events.on('stash.widget.breadcrumbs.urlChanged', function(url) {
            if (this === breadcrumbs) {
                events.trigger('stash.layout.files.urlChanged', this, url);
            }
        });

        /* React to page changes */
        events.on('stash.page.*.revisionRefChanged', function(revisionReference) {
            currentRevisionRef = revisionReference;
            breadcrumbs.update(currentRevisionRef, pageState.getFilePath(), isDirectory);
        });

        events.on('stash.page.*.pathChanged', function(path) {
            pageState.setFilePath(path);
            breadcrumbs.update(currentRevisionRef, path, isDirectory);
            // For now, isDirectory won't change when path changes cause we don't have push-state
        });
    };
});
