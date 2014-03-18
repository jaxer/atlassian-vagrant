define('feature/user/user-groups-table', [
    'aui',
    'jquery',
    'underscore',
    'util/ajax',
    'util/error',
    'util/navbuilder',
    'feature/user/group-multi-selector',
    'feature/user/group-table'
], function (
    AJS,
    $,
    _,
    ajax,
    errorUtil,
    navBuilder,
    GroupMultiSelector,
    GroupTable
) {

    'use strict';

    var addButtonSelector = '.add-button';
    var addPickerSelector = '.groups-multi-selector';
    var deleteButtonsSelector = '.delete-button';

    /**
     * Table holding the groups of a user.
     *
     * @param options config options
     * @constructor
     *
     * List of config options:
     * - onError: a callback allowing the caller to be notified of any error
     * - see {@link PagedTable.defaultOptions}
     */
    function UserGroupsTable(options) {
        GroupTable.call(this, $.extend({}, {
            filterable: false,
            noneFoundMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.users.groups.noneFound', 'This user is not a member of any group'))
        }, options));
        this.username = this.$table.attr('data-username');
        this.onError = options.onError || errorUtil.showNonFieldErrors;
        this._initBindings = _.once(this._initBindings);
    }

    $.extend(UserGroupsTable.prototype, GroupTable.prototype);

    UserGroupsTable.prototype.buildUrl = function (start, limit, filter) {
        return navBuilder.admin().users().addPathComponents('more-members').withParams({
            context: this.username,
            start: start,
            limit: limit
        }).build();
    };

    UserGroupsTable.prototype.init = function () {
        GroupTable.prototype.init.call(this);
        this._initBindings();
    };

    UserGroupsTable.prototype.handleErrors = function (errors) {
        var self = this;
        _.each(errors, function(error) {
            self.onError(error.message);
        });
    };

    UserGroupsTable.prototype.handleNewRows = function(groupPage, attachmentMethod) {
        this.$table.find('tbody')[attachmentMethod](stash.feature.user.userGroupsRows({
            groups : groupPage.values
        }));
    };

    UserGroupsTable.prototype.remove = function (group) {
        var self = this;
        if (GroupTable.prototype.remove.call(this, group)) {
            var $row = this.$table.find('tbody > tr[data-name]').filter(function() {
                return $(this).attr('data-name') === group.name;
            });
            $row.fadeOut('fast', function() {
                $row.remove();
                self.updateTimestamp();
            });
        }
    };

    UserGroupsTable.prototype._initBindings = function () {
        var self = this;
        var groupsSelector = new GroupMultiSelector($(addPickerSelector, self.$table), {
            url: navBuilder.admin().users().addPathComponents('more-non-members').withParams({
                context: self.username
            }).build()
        });

        self.$table.on('click', addButtonSelector, function (e) {
            e.preventDefault();
            var groups = groupsSelector.getSelectedItems();
            var groupNames = _.pluck(groups, 'name');
            self._addGroups(self.username, groupNames).done(function () {
                groupsSelector.clearSelectedItems();
                self.add(_.map(groups, function (group) {
                    return $.extend({justAdded: true}, group);
                }));
            }).fail(function (xhr, textStatus, error, data) {
                self.handleErrors(self._extractErrors(data, error));
            });
        });

        self.$table.on('click', deleteButtonsSelector, function (e) {
            e.preventDefault();
            var groupName = $(e.target).closest('a').attr('data-for');
            self._removeGroups(self.username, groupName).done(function () {
                self.remove({ name: groupName });
            }).fail(function (xhr, textStatus, error, data) {
                self.handleErrors(self._extractErrors(data, error));
            });
        });
    };

    UserGroupsTable.prototype._addGroups = function (username, groupNames) {
        return ajax.rest({
            data: {
                user: username,
                groups: groupNames
            },
            statusCode: {
                '403': false,
                '404': false
            },
            type: 'POST',
            url: navBuilder.admin().users().addPathComponents('add-groups').build()
        });
    };

    UserGroupsTable.prototype._removeGroups = function (username, groupName) {
        return ajax.rest({
            data: {
                context: username,
                itemName: groupName
            },
            statusCode: {
                '403': false,
                '404': false,
                '409': false
            },
            type: 'POST',
            url: navBuilder.admin().users().addPathComponents('remove-group').build()
        });
    };

    UserGroupsTable.prototype._extractErrors = function (data) {
        return data && data.errors && data.errors.length ? data.errors : [{
            message: AJS.escapeHtml(stash_i18n('stash.web.users.group.unknown.error', 'An unknown error has occurred'))
        }];
    };

    return UserGroupsTable;
});