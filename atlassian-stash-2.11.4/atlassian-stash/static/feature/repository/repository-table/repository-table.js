define('feature/repository/repository-table', [
    'jquery',
    'underscore',
    'widget/paged-table',
    'util/navbuilder',
    'model/page-state'
], function(
    $,
    _,
    PagedTable,
    navbuilder,
    pageState
) {
        function RepositoryTable(repositoryTableSelector, options) {
            var defaults = {
                target: repositoryTableSelector,
                ajaxDataType: 'json',
                tableMessageClass: 'repository-table-message',
                allFetchedMessageHtml: '<p class="no-more-results">' + stash_i18n('stash.web.repositories.allfetched', 'No more repositories') + '</p>',
                noneFoundMessageHtml: '<h3 class="no-results entity-empty">' + stash_i18n('stash.web.repositories.nonefetched', 'There are no repositories') + '</h3>',
                statusCode: {
                    '401': function() {
                        //If the project is not accessible display no repos
                        return $.Deferred().resolve({ start: 0, size: 0, values: [], isLastPage: true}).promise();
                    }
                }
            };
            options = _.extend({}, defaults, options);
            PagedTable.call(this, options);

            if (options.projectKey) {
                // This is a dirty hack for the profile page
                this._project = { key: options.projectKey, 'public' : false };
            } else {
                var currentProject = pageState.getProject();
                this._project = currentProject && currentProject.toJSON();
            }
            this._options = options;
        }

        _.extend(RepositoryTable.prototype, PagedTable.prototype);

        RepositoryTable.prototype.buildUrl = function(start, limit) {
            return navbuilder.project(this._project.key).allRepos()
                .withParams({
                    start : start,
                    limit : limit
                }).build();
        };

        RepositoryTable.prototype.handleNewRows = function (data, attachmentMethod) {
            // This is a dirty hack for the profile page
            var currentProject = this._project;
            var options = this._options;
            var rows = _.map(data.values, function(repo) {
                if (!repo.project) {
                    if (currentProject) {
                        repo.project = currentProject;
                    } else {
                        // If this occurs it is a programming error and we want to fail loudly
                        throw "No project was provided for repo id=" + repo.id + " slug=" + repo.slug + " but we are in a global context";
                    }
                }
                return stash.feature.repository.repositoryRow({
                    repository: repo,
                    showProject: options.showProject,
                    showPublicStatus: options.showPublicStatus
                });
            });
            this.$table.show().children("tbody")[attachmentMethod !== 'html' ? attachmentMethod : 'append'](rows.join(''));
        };

        RepositoryTable.prototype.handleErrors = function (errors) {
        };

        return RepositoryTable;
    }
);