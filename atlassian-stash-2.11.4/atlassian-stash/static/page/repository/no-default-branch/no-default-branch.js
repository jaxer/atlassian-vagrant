define('page/repository/noDefaultBranch',
['util/events', 'util/navbuilder', 'exports'],
function(events, navbuilder, exports) {
    exports.onReady = function() {
        events.on('stash.feature.repository.revisionReferenceSelector.revisionRefChanged', function(revisionReference) {
            var uri = navbuilder.parse(location.href);
            uri.addQueryParam("at", revisionReference.getId());
            location.href = uri.toString();
        });
    };
});