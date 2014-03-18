define('feature/repository/source-target-selector', [
    'jquery',
    'underscore',
    'util/events',
    'util/ajax',
    'util/navbuilder',
    'feature/repository/related-repository-selector',
    'feature/repository/branch-selector'
], function(
    $,
    _,
    events,
    ajax,
    nav,
    RelatedRepositorySelector,
    BranchSelector
) {
    function SourceTargetSelector($container, sourceRepository, targetRepository, additionalPreloadRepositories, options) {
        this.init.apply(this, arguments);
    }

    SourceTargetSelector.prototype.defaults =  {
        showChangesetBadges: true
    };

    SourceTargetSelector.prototype.init = function($container, sourceRepository, targetRepository, additionalPreloadRepositories, options) {
        var self = this;

        self.refSelectors = {};
        self.options = $.extend({}, self.defaults, options);

        var contexts = [
            { name: 'source', repository: sourceRepository },
            { name: 'target', repository: targetRepository }
        ];

        var preloadedRepoPage = RelatedRepositorySelector.constructDataPageFromPreloadArray(
            _.chain(contexts)
                .pluck('repository')
                .union(additionalPreloadRepositories)
                .compact()
                .uniq(function(repo) { return repo.getId(); }) // remove dupes
                .invoke('toJSON')
                .value());

        _.each(contexts, function(context){
            var $branchSelectorTrigger = $('.' + context.name + 'Branch', $container);
            var $branchInput = $branchSelectorTrigger.next('input');
            var $repoSelectorTrigger = $('.' + context.name + 'Repo', $container);
            var $repoInput = $repoSelectorTrigger.next('input');

            var refSelector = {
                $headChangesetSpinner: $("<div class='spinner'/>").insertAfter($branchInput),
                branchSelector: new BranchSelector($branchSelectorTrigger, {
                    id: context.name + 'BranchDialog',
                    context: context.name,
                    repository: context.repository,
                    field: $branchInput
                }),
                repoSelector: new RelatedRepositorySelector($repoSelectorTrigger, {
                    id: context.name + "RepoDialog",
                    context: context.name,
                    repository: context.repository,
                    field: $repoInput,
                    preloadData: preloadedRepoPage
                }),
                getBranch: function() {
                    return this.branchSelector.getSelectedItem();
                },
                getRepo: function() {
                    return this.repoSelector.getSelectedItem();
                }
            };

            self.refSelectors[context.name] = refSelector;
        });

        events.on('stash.feature.repository.revisionReferenceSelector.revisionRefChanged', function(revisionRef, context) {
            var refSelector = self.refSelectors[context];

            if (self.options.showChangesetBadges) {
                self._updateChangesetBadge(refSelector, revisionRef);
            }

            // Focus the next input user needs to fill in
            if (context === 'source') {
                self.refSelectors.target.repoSelector.$trigger.focus();
            }

            events.trigger('stash.feature.repository.sourceTargetSelector.' + context + '.revisionRefChanged', self, revisionRef);
        });


        events.on('stash.feature.repository.repositorySelector.repositoryChanged', function(repository, context) {
            var refSelector = self.refSelectors[context];
            refSelector.branchSelector.setRepository(repository);
            refSelector.branchSelector.$trigger.focus();

            if (self.options.showChangesetBadges) {
                self._updateChangesetBadge(refSelector, null);
            }

            events.trigger('stash.feature.repository.sourceTargetSelector.' + context + '.repositoryChanged', self, repository);
        });

        return self;
    };

    SourceTargetSelector.prototype._updateChangesetBadge = function(refSelector, revisionRef) {
        var self = this,
            $changesetBadge = refSelector.branchSelector.$trigger.siblings('.changeset-badge-detailed').hide();

        if (revisionRef) {
            refSelector.$headChangesetSpinner.show().spin('small');
            var repo = refSelector.getRepo();
            ajax.rest({
                url: nav.rest().project(repo.getProject()).repo(repo).commit(revisionRef.getLatestChangeset()).build()
            }).done(function (changeset) {
                    var $newChangesetBadge = $(stash.feature.changeset.changesetBadge.detailed({
                        changeset: changeset,
                        repository: repo.toJSON()
                    })).hide();

                    $changesetBadge.replaceWith($newChangesetBadge);
                    $newChangesetBadge.fadeIn();
                }).always(function () {
                    refSelector.$headChangesetSpinner.spinStop().hide();
                });
        } else {
            $changesetBadge.empty();
        }
    };

    SourceTargetSelector.prototype.branchesSelected = function() {
        return !!(this.refSelectors.source.getBranch() && this.refSelectors.target.getBranch());
    };

    SourceTargetSelector.prototype.refsAreEqual = function() {
        var sourceRef = this.refSelectors.source.getBranch();
        var targetRef = this.refSelectors.target.getBranch();

        return !!(sourceRef && sourceRef.isEqual(targetRef));
    };

    SourceTargetSelector.prototype.getSourceRepository = function() {
        return this.refSelectors.source.getRepo();
    };

    SourceTargetSelector.prototype.getTargetRepository = function() {
        return this.refSelectors.target.getRepo();
    };

    SourceTargetSelector.prototype.getSourceBranch = function() {
        return this.refSelectors.source.getBranch();
    };

    SourceTargetSelector.prototype.getTargetBranch = function() {
        return this.refSelectors.target.getBranch();
    };

    return SourceTargetSelector;
});
