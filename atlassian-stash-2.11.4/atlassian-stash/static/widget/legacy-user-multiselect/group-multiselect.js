define('widget/group-multiselect', [
    'aui',
    'underscore',
    'util/ajax',
    'util/deprecation',
    'widget/user-multiselect-commons'
], function(
    AJS,
    _,
    ajax,
    deprecate,
    commons) {

    function formatNoMatches() {
        return AJS.escapeHtml(stash_i18n('stash.web.group-multiselect.nomatch', 'No matching group found'));
    }

    function GroupMultiSelect($textfield, initialGroups, url) {

        var opts,
            self = this;

        this._initialGroups = initialGroups;
        this._$textfield = $textfield;

        // Rather than storing the selected group data in a delimited string in a form field,
        // we hook in to the initialisation and change events and maintain an array of selected group.
        this._selectedGroups = [];


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
                url: url,
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

                    data.values = _.chain(data.values)
                        .map(function (group) {
                            return {
                                id: group.name,
                                text: group.name,
                                group: group
                            };
                        })
                        .value();

                    return {
                        more: !data.isLastPage,
                        results: data.values
                    };
                }
            },
            formatSelection: function(object) {
                return commons.formatGroupSelection(object.group);
            },
            formatResult: function(object) {
                return commons.formatGroupResult(object.group);
            },
            initSelection: function(element, callback) {
                var data = [];
                _.each(self._initialGroups, function (group) {
                    data.push({id: group.name, text: group.name, group: group});
                });
                self._selectedGroups = data;
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
        .on("change", _.bind(this.updateSelectedGroups, this));
    }

    GroupMultiSelect.prototype.getSelectedGroups = function() {
        return this._selectedGroups;
    };

    GroupMultiSelect.prototype.clearSelected = function() {
        this._initialGroups = [];
        this._$textfield.auiSelect2('val', []);
    };

    GroupMultiSelect.prototype.updateSelectedGroups = function(changeEvent) {
        if (changeEvent.removed) {
            this._selectedGroups = _.reject(this._selectedGroups, function(selection) { return (selection.id === changeEvent.removed.id); });
        }
        if (changeEvent.added) {
            this._selectedGroups.push(changeEvent.added);
        }
    };

    return deprecate.construct(
        GroupMultiSelect,
        'widget/group-multiselect',
        'feature/user/group-multi-selector',
        '2.5',
        '3.0');
});
