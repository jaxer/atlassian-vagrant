define('feature/repository/repository-search', [
    'jquery',
    'underscore',
    'xregexp',
    'util/navbuilder',
    'util/events',
    'widget/searchable-selector'
], function(
    $,
    _,
    XRegExp,
    nav,
    events,
    SearchableSelector
) {
    // Get a hold of the list of recent repositories when they're loaded
    var recentRepositories = null;
    events.on('stash.feature.repositories.recent.loaded', function(data) {
        recentRepositories = data;
    });

    /**
     * @return {RepositorySearch} The new RepositorySearch instance
     *
     * @param {HTMLElement|jQuery}  searchField     The text input for the search
     * @param {HTMLElement|jQuery}  trigger         The element off which the dialog should be positioned. Can be the same element as searchField
     * @param {Object}              options         A hash of options, valid options are specified in SearchableSelector.prototype.defaults
     */
    var RepositorySearch = function(searchField, trigger, options) {
        options = options || {};
        options.externalSearchField = searchField;

        var repositorySearch = this.init(trigger, options);
        repositorySearch._bindSearchFieldEvents();
        return repositorySearch;
    };

    $.extend(RepositorySearch.prototype, SearchableSelector.prototype);

    RepositorySearch.prototype._generatePreloadData = function() {
        // Don't show anything yet if we don't have any recent repo matches to show
        if (recentRepositories == null) {
            return null;
        }
        // Filter the recent repositories list as the server-side would
        var values;
        var searchRequest = this._parseSearchTerm(this._getSearchTerm());
        if (searchRequest) {
            var projectRegex = searchRequest.projectName && new RegExp('^' + XRegExp.escape(searchRequest.projectName), 'i');
            var repositoryRegex = searchRequest.repositoryName && new RegExp('^' + XRegExp.escape(searchRequest.repositoryName), 'i');
            values = _.filter(recentRepositories.values, function(value) {
                return (searchRequest.projectName == null || value.project.name.match(projectRegex) != null) &&
                    (searchRequest.repositoryName == null || value.name.match(repositoryRegex) != null);
            });
        } else {
            values = recentRepositories.values;
        }
        // Sort the results as the server-side would
        values.sort(function(a, b) {
            return (searchRequest && searchRequest.projectName ?  a.project.name.localeCompare(b.project.name) : 0) ||
                a.name.localeCompare(b.name) ||
                a.id - b.id;
        });
        return _.extend({}, recentRepositories, {
            values: values,
            size: values.length,
            isLastPage: false
        });
    };

    RepositorySearch.prototype.defaults = $.extend({}, SearchableSelector.prototype.defaults, {
        extraClasses: 'repository-search-dialog',
        url: nav.rest().allRepos().withParams({
            avatarSize: stash.widget.avatarSizeInPx({ size: 'xsmall' })
        }).build(),
        queryParamsBuilder: function(searchTerm, start, limit) {
            var searchRequest = this._parseSearchTerm(searchTerm);
            if (searchRequest == null) return null;

            return {
                start: start,
                limit: limit,
                name: searchRequest.repositoryName,
                projectname: searchRequest.projectName
            };
        },
        dataTransform: function(data, searchTerm) {
            var searchRequest = this._parseSearchTerm(searchTerm);
            if (searchRequest == null) return data;

            return $.extend({
                repositorySearchTerm: searchRequest.repositoryName,
                projectSearchTerm: searchRequest.projectName
            }, data);
        },
        preloadData: RepositorySearch.prototype._generatePreloadData,
        alwaysShowPreload: true,
        followLinks: true,
        resultsTemplate: stash.feature.repository.repositorySearchResults,
        noResultsText: stash_i18n('stash.web.repository-search.results.empty', 'No repositories matching your search'),
        noMoreResultsText: stash_i18n('stash.web.repository-search.results.end', 'No more repositories'),
        adjacentItems: false,
        clearResultsOnSearch: false,
        popUpOffsetY: 1
    });

    RepositorySearch.prototype._bindSearchFieldEvents = function() {
        var repositorySearch = this;
        // Prevent form submission must be bound on keydown
        this.$searchField.on('keydown.repository-search', function(e) {
            if (e.which === $.ui.keyCode.ENTER) {
                e.preventDefault();
            }
        });
        // Blur on pressing escape needs to be bound to keyup and not keydown,
        // otherwise the keyup will not trigger
        this.$searchField.on('keyup.repository-search', function(e) {
            var dialogVisible = repositorySearch.dialog.is(':visible');
            if (!dialogVisible && e.which === $.ui.keyCode.ESCAPE) {
                $(this).blur();
            }
        });
    };

    RepositorySearch.prototype._parseSearchTerm = function(searchTerm) {
        searchTerm = $.trim(searchTerm);
        if (searchTerm === '' || searchTerm === '/') {
            return null; // don't search
        }

        var searchRequest = {};
        var indexOfSeparator = searchTerm.lastIndexOf('/');
        if (indexOfSeparator === -1) {
            searchRequest.projectName = null;
            searchRequest.repositoryName = searchTerm;
        } else {
            searchRequest.projectName = $.trim(searchTerm.substr(0, indexOfSeparator));
            searchRequest.repositoryName = $.trim(searchTerm.substr(indexOfSeparator + 1));
        }
        return searchRequest;
    };

    // @override
    RepositorySearch.prototype._showSpinner = function(scrollable) {
        // Ensure the one in the scrollable is hidden
        scrollable.$scrollElement.find('.spinner').hide();

        this.$searchField.addClass('loading').next('.spinner').spin();
    };

    // @override
    RepositorySearch.prototype._hideSpinner = function() {
        this.$searchField.removeClass('loading').next('.spinner').spinStop();
    };

    return RepositorySearch;
});