define('feature/user/group-table', [
    'aui',
    'jquery',
    'util/function',
    'util/navbuilder',
    'widget/paged-table'
], function(
    AJS,
    $,
    fn,
    nav,
    PagedTable) {

    /**
     * Table holding the available groups.
     *
     * @param options config options
     * @see {@link PagedTable}'s constructor
     * @constructor
     */
    function GroupTable(options) {
        PagedTable.call(this, $.extend({}, GroupTable.defaults, options));
    }

    $.extend(GroupTable.prototype, PagedTable.prototype);

    GroupTable.defaults = {
        filterable: true,
        noneMatchingMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.grouptable.nomatch', 'No groups matched your search term')),
        noneFoundMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.grouptable.nogroups', 'No groups')),
        idForEntity: fn.dot('name')
    };

    GroupTable.prototype.buildUrl = function(start, limit, filter) {
        var params = {
            start : start,
            limit : limit
        };
        if (filter) {
            params.filter = filter;
        }
        return nav.admin().groups().withParams(params).build();
    };

    GroupTable.prototype.handleNewRows = function(groupPage, attachmentMethod) {
        this.$table.find('tbody')[attachmentMethod](stash.feature.user.groupRows({
            groups : groupPage.values
        }));
    };

    return GroupTable;
});