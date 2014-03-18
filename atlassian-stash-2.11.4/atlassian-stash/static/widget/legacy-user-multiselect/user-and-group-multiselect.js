/**
 * Multiselect that allows to select both users and groups from the same control.
 */
define('widget/user-and-group-multiselect', ['aui', 'jquery', 'underscore', 'util/ajax', 'util/deprecation', 'util/navbuilder', 'widget/user-multiselect-commons'],
    function(AJS, $, _, ajax, deprecate, nav, commons) {

        function userToSelect2Entity(user) {
            return {
                id: "user:" + user.name,
                text: user.displayName || user.name,
                user: user
            };
        }

        function groupToSelect2Entity(groupName) {
            return {
                id: "group:" + groupName,
                text: groupName,
                group: {
                    name: groupName,
                    displayName: groupName
                }
            };
        }

        function isEntityOfType(entity, type) {
            return entity.id && entity.id.indexOf(type) === 0;
        }

        function formatNoMatches() {
            return AJS.escapeHtml(stash_i18n('stash.web.user-and-group-multiselect.nomatch', 'No matching users or groups found'));
        }

        function UserAndGroupMultiSelect($textfield, initialUsers, initialGroups, excludedUsernames) {

            var self = this;

            var nextUserPageStart = 0,
                nextGroupPageStart = 0;

            this._initialUsers = initialUsers;
            this._initialGroups = initialGroups;
            this._$textfield = $textfield;

            // Rather than storing the selected user/group data in a delimited string in a form field,
            // we hook in to the initialisation and change events and maintain an array of selected users.
            this._selectedUsers = [];
            this._selectedGroups = [];

            function resultComparator(r1, r2) {
                if (r1 === r2) {
                    return 0;
                } else if (!r1.text) {
                    return -1;
                } else if (!r2.text) {
                    return 1;
                }
                return r1.text.toLowerCase().localeCompare(r2.text.toLowerCase());
            }

            $textfield.select2({
                query : function(opts) {
                    // clear paging indices for new search
                    if (opts.page <= 1) {
                        nextUserPageStart = 0;
                        nextGroupPageStart = 0;
                    }

                    // parameters common to both the user & group end-points
                    var commonParams = {
                        filter: commons.filterSearchTerm(opts.term),
                        limit: commons.fetchLimit
                    };

                    // deferred for resolving the next page of matching users,
                    // or the empty array if we've reached the last page
                    var userResults;
                    // page start index of null indicates we've retrieved the last page
                    if (nextUserPageStart !== null) {
                        userResults = ajax
                            .rest({
                                url: nav.rest().users().build(),
                                data: $.extend(true, {}, commonParams, {
                                    start: opts.page > 1 ? nextUserPageStart : 0,
                                    avatarSize : commons.avatarSize
                                })
                            })
                            .then(function(data) {
                                nextUserPageStart = data.isLastPage ? null : data.nextPageStart;
                                return data.values;
                            });
                    } else {
                        userResults = [];
                    }

                    // deferred for resolving the next page of matching groups,
                    // or the empty array if we've reached the last page
                    var groupResults;
                    // page start index of null indicates we've already retrieved the last page
                    if (nextGroupPageStart !== null) {
                        groupResults = ajax
                            .rest({
                                url: nav.rest().groups().build(),
                                data: $.extend(true, {}, commonParams, {
                                    start: opts.page > 1 ? nextGroupPageStart : 0
                                })
                            })
                            .then(function(data) {
                                nextGroupPageStart = data.isLastPage ? null : data.nextPageStart;
                                return data.values;
                            });
                    } else {
                        groupResults = [];
                    }

                    $.when(userResults, groupResults)
                     .then(function(users, groups) {
                        // combine users and groups into single list of shapes accepted by our formatter functions
                        var combined = _.map(users, userToSelect2Entity)
                                        .concat(_.map(groups, groupToSelect2Entity));

                        // filter out excluded users (if defined)
                        if (excludedUsernames && excludedUsernames.length) {
                            combined = _.reject(combined, function(result) {
                                return isEntityOfType(result, 'user') && _.indexOf(excludedUsernames, result.user.name) >= 0;
                            });
                        }

                        // invoke the select2 callback to display the results
                        opts.callback({
                            results: combined.sort(resultComparator),
                            more: !!(nextUserPageStart || nextGroupPageStart)
                        });
                    });
                },
                formatSelection: function(entity) {
                    if (isEntityOfType(entity, 'user')) {
                        return commons.formatUserSelection(entity.user);
                    } else if (isEntityOfType(entity, 'group')) {
                        return commons.formatGroupSelection(entity.group);
                    } else {
                        throw new Error("unknown entity " + JSON.stringify(entity));
                    }
                },
                formatResult: function(entity) {
                    if (isEntityOfType(entity, 'user')) {
                        return commons.formatUserResult(entity.user);
                    } else if (isEntityOfType(entity, 'group')) {
                        return commons.formatGroupResult(entity.group);
                    } else {
                        throw new Error("unknown entity " + JSON.stringify(entity));
                    }
                },
                initSelection: function(element, callback) {
                    var users = _.map(self._initialUsers, userToSelect2Entity);
                    var groups = _.map(self._initialGroups, groupToSelect2Entity);
                    self._selectedUsers = users;
                    self._selectedGroups = groups;
                    callback([].concat(users, groups));
                },
                separator: '|!|', // Only used for Pull Request Create, should be removed later on when we do that properly.
                multiple: true,
                minimumInputLength: commons.minimumInputLength,
                formatInputTooShort: commons.formatInputTooShort,
                formatNoMatches: formatNoMatches,
                containerCssClass: commons.containerCssClass,
                dropdownCssClass: commons.dropdownCssClass,
                quietMillis: commons.quietMillis
            })
            .on("change", _.bind(this.updateSelectedEntities, this))
            .on("open", function() {
                commons.showNoResultsIfAllDisabled(formatNoMatches);
            });
        }

        UserAndGroupMultiSelect.prototype.getSelectedUsers = function() {
            return _.pluck(this._selectedUsers, 'user');
        };

        UserAndGroupMultiSelect.prototype.getSelectedGroups = function() {
            return _.pluck(this._selectedGroups, 'group');
        };

        UserAndGroupMultiSelect.prototype.setSelected = function(data) {
            this._initialUsers = data.users;
            this._initialGroups = data.groups;
            this._$textfield.auiSelect2('val', _.pluck(data.users, 'name').concat(data.groups));
        };

        UserAndGroupMultiSelect.prototype.clearSelected = function() {
            this.setSelected({
                users: [],
                groups: []
            });
        };

        UserAndGroupMultiSelect.prototype.updateSelectedEntities = function(changeEvent) {
            if (changeEvent.removed) {
                this.removeFromEntityList(changeEvent.removed);
            }
            if (changeEvent.added) {
                this.addToEntityList(changeEvent.added);
            }
        };

        UserAndGroupMultiSelect.prototype.addToEntityList = function(entity) {
            if (isEntityOfType(entity, 'user')) {
                return this._selectedUsers.push(entity);
            } else if (isEntityOfType(entity, 'group')) {
                return this._selectedGroups.push(entity);
            } else {
                throw new Error("can not add invalid entity " + entity);
            }
        };

        UserAndGroupMultiSelect.prototype.removeFromEntityList = function(entity) {
            var removeEntity = function(list) {
                return _.reject(list, function(selection) { return (selection.id === entity.id); });
            };
            if (isEntityOfType(entity, 'user')) {
                this._selectedUsers = removeEntity(this._selectedUsers);
            } else if (isEntityOfType(entity, 'group')) {
                this._selectedGroups = removeEntity(this._selectedGroups);
            } else {
                throw new Error("can not remove invalid entity " + entity);
            }
        };

        return deprecate.construct(
            UserAndGroupMultiSelect,
            'widget/user-and-group-multiselect',
            'feature/user/user-and-group-multi-selector',
            '2.5',
            '3.0');
    });
