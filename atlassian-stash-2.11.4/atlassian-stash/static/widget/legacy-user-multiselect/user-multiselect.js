define('widget/user-multiselect', [
    'aui',
    'underscore',
    'util/ajax',
    'util/deprecation',
    'util/navbuilder',
    'widget/user-multiselect-commons'
], function(
    AJS,
    _,
    ajax,
    deprecate,
    nav,
    commons) {

    function formatNoMatches() {
        return AJS.escapeHtml(stash_i18n('stash.web.user-multiselect.nomatch', 'No matching user found'));
    }

    function UserMultiSelect($textfield, initialUsers, excludedUsernames, url) {

        var opts,
            self = this;

        this._initialUsers = initialUsers;
        this._$textfield = $textfield;

        // Rather than storing the selected user data in a delimited string in a form field,
        // we hook in to the initialisation and change events and maintain an array of selected users.
        this._selectedUsers = [];


        var nextPageStart = 0;
        $textfield.select2(opts = {
            ajax: {
                transport: function(opts) {
                    var success = opts.success;
                    delete opts.success;

                    // Order matters: Select2's success callback will render the markup, then we can react to
                    // that in our callback.
                    return ajax.rest.apply(ajax, arguments).done(success).done(function() {
                        commons.showNoResultsIfAllDisabled(formatNoMatches);
                    });
                },
                url: url || nav.rest().users().build(),
                data: function(term, page) {
                    return {
                        filter: commons.filterSearchTerm(term),
                        start: page > 1 ? nextPageStart : 0,
                        limit: commons.fetchLimit,
                        avatarSize : commons.avatarSize
                    };
                },
                results: function(data, page) {
                    nextPageStart = data.nextPageStart;

                    var userResults = _.chain(data.values)
                                        .map(function (user) {
                                            return {
                                                id: user.name,
                                                text: user.displayName,
                                                user: user
                                            };
                                        });

                    if (excludedUsernames && excludedUsernames.length) {
                        userResults = userResults.reject(function(result) {
                            return _.indexOf(excludedUsernames, result.user.name) >= 0;
                        });
                    }

                    data.values = userResults.value();
                    data.size = data.values.length;

                    return {
                        more: !data.isLastPage,
                        results: data.values
                    };
                }
            },
            formatSelection: function(object) {
                return commons.formatUserSelection(object.user);
            },
            formatResult: function(object) {
                return commons.formatUserResult(object.user);
            },
            initSelection: function(element, callback) {
                var data = [];
                _.each(self._initialUsers, function (user) {
                    data.push({id: user.name, text: user.displayName || user.name, user: user});
                });
                self._selectedUsers = data;
                callback(data);
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
        .on("change", _.bind(this.updateSelectedUsers, this));
    }

    UserMultiSelect.prototype.getSelectedUsers = function() {
        return this._selectedUsers;
    };

    UserMultiSelect.prototype.clearSelected = function() {
        this._initialUsers = [];
        this._$textfield.auiSelect2('val', []);
    };

    UserMultiSelect.prototype.updateSelectedUsers = function(changeEvent) {
        if (changeEvent.removed) {
            this._selectedUsers = _.reject(this._selectedUsers, function(selection) { return (selection.id === changeEvent.removed.id); });
        }
        if (changeEvent.added) {
            this._selectedUsers.push(changeEvent.added);
        }
    };

    return deprecate.construct(
        UserMultiSelect,
        'widget/user-multiselect',
        'feature/user/user-multi-selector',
        '2.5',
        '3.0');
});
