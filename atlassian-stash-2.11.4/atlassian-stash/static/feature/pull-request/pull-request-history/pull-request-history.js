define('feature/pull-request/pull-request-history', [
    'jquery',
    'util/events',
    'util/client-storage',
    'exports'
], function(
    $,
    events,
    clientStorage,
    exports
) {

    var historyKey,
        viewedFiles;
    function initViewedState(diffTree) {
        initSubtreeViewedState(diffTree.$tree);
    }
    function initSubtreeViewedState($tree) {
        var $leafNodes = $tree.find('.jstree-leaf');
        $leafNodes.each(function(index, el){
            var $el = $(el),
                path = $el.data('path').toString,
                contentId = $el.data('contentId');
            if (viewedFiles[path] === contentId) {
                $el.addClass('viewed');
            }
        });
    }
    function updateViewedState($node) {
        var path = $node.data('path').toString,
            contentId = $node.data('contentId');
        if (viewedFiles[path] !== contentId) {
            viewedFiles[path] = contentId;
            clientStorage.setItem(historyKey, viewedFiles);
            $node.addClass('viewed');
        }
    }
    exports.init = function(){
        historyKey = clientStorage.buildKey('history', 'pull-request');
        viewedFiles = clientStorage.getItem(historyKey) || {};
        events.on('stash.feature.changeset.difftree.treeInitialised', initViewedState);
        events.on('stash.feature.changeset.difftree.nodeOpening', initSubtreeViewedState);
        events.on('stash.feature.changeset.difftree.selectedNodeChanged', updateViewedState);
    };
    exports.reset = function(){
        historyKey = null;
        viewedFiles = null;
        events.off('stash.feature.changeset.difftree.treeInitialised', initViewedState);
        events.off('stash.feature.changeset.difftree.nodeOpening', initSubtreeViewedState);
        events.off('stash.feature.changeset.difftree.selectedNodeChanged', updateViewedState);
    };
});