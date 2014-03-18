define('page/global-repository-list', [
    'jquery',
    'util/navbuilder',
    'feature/repository/repository-table',
    'exports'
], function (
    $,
    navBuilder,
    RepositoryTable,
    exports) {

    function GlobalRepositoryTable(repositoryTableSelector, options) {
        options = $.extend({
            showProject: true,
            bufferPixels: $('#footer').height()
        }, options);
        RepositoryTable.call(this, repositoryTableSelector, options);
    }

    $.extend(GlobalRepositoryTable.prototype, RepositoryTable.prototype);

    GlobalRepositoryTable.prototype.buildUrl = function(start, limit) {
        return navBuilder.allRepos()
            .visibility('public')
            .withParams({
                avatarSize: stash.widget.avatarSizeInPx({ size : 'small' }),
                start : start,
                limit : limit
            }).build();
    };

    exports.onReady = function(repositoryTableSelector) {
        if ($(repositoryTableSelector).length) {
            new GlobalRepositoryTable(repositoryTableSelector).init();
        }
    };
});
