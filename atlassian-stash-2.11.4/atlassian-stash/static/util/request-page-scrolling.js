define('util/request-page-scrolling', [
    'layout/page-scrolling-manager'
], function(
    pageScrollingManager
) {
    return function() {
        return pageScrollingManager._requestScrollControl();
    };
});