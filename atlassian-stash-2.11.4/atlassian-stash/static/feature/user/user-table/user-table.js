define('feature/user/user-table', [
    'aui',
    'jquery',
    'util/navbuilder',
    'widget/paged-table'
], function(
    AJS,
    $,
    nav,
    PagedTable) {

    function UserTable(options) {
        PagedTable.call(this, $.extend({
            filterable: true,
            noneMatchingMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.usertable.nomatch', 'No users matched your search term')),
            noneFoundMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.usertable.nousers', 'No users'))
        }, options));
    }

    $.extend(UserTable.prototype, PagedTable.prototype);

    UserTable.prototype.buildUrl = function(start, limit, filter) {
        var params = {
            start : start,
            limit : limit,
            avatarSize: stash.widget.avatarSizeInPx({ size : 'small' })
        };
        if (filter) {
            params.filter = filter;
        }
        return nav.admin().users().withParams(params).build();
    };

    UserTable.prototype.handleNewRows = function(userPage, attachmentMethod) {
        this.$table.find('tbody')[attachmentMethod](stash.feature.user.userRows({
            users : userPage.values
        }));
    };

    return UserTable;
});