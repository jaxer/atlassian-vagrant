define('page/pull-requests-create',[
    'jquery',
    'underscore',
    'util/events',
    'util/navbuilder',
    'util/dirty-tracker',
    'model/page-state',
    'model/repository',
    'widget/mentionable-textarea',
    'widget/markup-preview',
    'feature/repository/source-target-selector',
    'feature/commits/commits-table',
    'feature/pull-request/pull-request-metadata-generator',
    'feature/user/user-multi-selector',
    'exports'
], function(
    $,
    _,
    events,
    nav,
    dirtyTracker,
    pageState,
    Repository,
    MentionableTextarea,
    markupPreview,
    SourceTargetSelector,
    CommitsTable,
    metadataGen,
    UserMultiSelector,
    exports
) {
    var sourceTargetSelector,
        $commitsContainer = $("#create-pull-request-commits"),
        $createForm = $('.pull-request-create-form'),
        $loadMoreTrigger = $commitsContainer.find('.load-more-trigger'),
        commitsTable,
        commitTablePreviewPageSize = 10,
        commitTableFullPageSize = 25;

    function initSourceTargetSelector($container, sourceRepository, targetRepository, additionalPreloadRepositories) {
        sourceTargetSelector = new SourceTargetSelector($container, sourceRepository, targetRepository, additionalPreloadRepositories);

        events.on('stash.feature.repository.sourceTargetSelector.source.revisionRefChanged', onRefSelectorChange);

        events.on('stash.feature.repository.sourceTargetSelector.target.revisionRefChanged', function(revisionRef) {
            onRefSelectorChange(revisionRef);
            $("#title").focus();
        });

        events.on('stash.feature.repository.sourceTargetSelector.source.repositoryChanged', function(repository) {
            onRefSelectorChange();
            updateDefaultTitle('');
        });

        events.on('stash.feature.repository.sourceTargetSelector.target.repositoryChanged', function(repository) {
            onRefSelectorChange();
            updateFormActionUrl(repository);
        });
    }

    function updateFormActionUrl(repository) {
        var actionUrl = nav.project(repository.getProject()).repo(repository).createPullRequest().build();
        $createForm.attr('action', actionUrl);
    }

    function initMetaDataGenerator() {
        var $title = $("#title"),
            $description = $("#description"),
            sourceBranch = sourceTargetSelector.getSourceBranch(),
            $commitTableRows = $('#create-pull-request-commits-table').find('tbody tr');

        events.on('stash.feature.repository.sourceTargetSelector.source.revisionRefChanged', function(newRevisionRef) {
            updateDefaultTitle(metadataGen.generateTitleFromBranchName(newRevisionRef));
        });

        events.on('stash.widget.commitsTable.contentAdded', function(content){
            if (content && !$description.attr('data-dirty')) {
                var description = metadataGen.generateDescriptionFromCommitsTableRows(content.values);

                if (content.start > 0) {
                    //This is not the first page of commits so append the current description to the generated one
                    description += $description.val();
                }

                var maxLength = 30000;
                var andMore = '\n\n...';
                updateDefaultDescription(description.length > maxLength ? description.substring(0, maxLength - andMore.length) + andMore : description);
            }
        });

        if(!$title.val() && sourceBranch) {
            //Generate initial title
            updateDefaultTitle(metadataGen.generateTitleFromBranchName(sourceBranch));
        }

        if(!$description.val() && $commitTableRows.length) {
            //Generate initial description
            updateDefaultDescription(metadataGen.generateDescriptionFromCommitsTableRows($commitTableRows));
        }
    }

    function updateDefaultTitle(title) {
        var $title = $("#title");

        if (!$title.attr("data-dirty")){
            $title.val(title);
        }
    }

    function updateDefaultDescription(description) {
        var $description = $("#description");

        if (description && !$description.attr("data-dirty")) {
            markupPreview.hideIfVisible($description.closest('form'));
            $description.val(description).trigger("keyup"); //Simulate keyup to trigger expanding textarea
        }
    }

    function clearDefaultDescription() {
        //clear the description if it's an unmodified default
        var $description = $("#description");

        if (!$description.attr("data-dirty")) {
            $description.val('');
        }
    }

    function getCommitsUrlBuilder() {
        //Swap the source and target repos in the URL to the opposite of what you'd expect because we need the commit
        //URLs to be in terms of the source repo. It makes no difference to the query which one is the secondaryRepository
        //and which is the primary
        var sourceRepo = sourceTargetSelector.getSourceRepository();
        return nav.project(sourceRepo.getProject()).repo(sourceRepo).commits().withParams({
            until : sourceTargetSelector.getSourceBranch().getLatestChangeset(),
            since :  sourceTargetSelector.getTargetBranch().getLatestChangeset(),
            secondaryRepositoryId : sourceTargetSelector.getTargetRepository().getId()
        });
    }

    function initCommitsTable() {
        commitsTable = new CommitsTable(getCommitsUrlBuilder, {
            target: "#create-pull-request-commits-table",
            pageSize: commitTableFullPageSize,
            allFetchedMessageHtml: stash_i18n('stash.web.pull-request.create.allcommitsfetched', 'No more commits to merge'),
            noneFoundMessageHtml: stash_i18n('stash.web.pull-request.create.nocommitsfetched', 'No commits to merge')
        });

        if (sourceTargetSelector.branchesSelected() && !sourceTargetSelector.refsAreEqual()) {
            commitsTable.init({suspended:true});
        }

        $loadMoreTrigger.find('a').on('click', function(e){
            e.preventDefault();

            if (!commitsTable.resume()) {
                commitsTable.loadAfter();
            }

            $loadMoreTrigger.toggleClass('hidden', true);
        });

        events.on('stash.widget.commitsTable.contentAdded', function(data){
            if(data.start === 0 && data.size && !data.isLastPage) {
                $loadMoreTrigger.toggleClass('hidden', false);
            } else {
                $loadMoreTrigger.toggleClass('hidden', true);
            }
        });
    }

    function onRefSelectorChange(revisionRef) {
        // Clear out the generated description whenever either branch changes, we aren't guaranteed that the `stash.widget.commitsTable.contentAdded` event will fire
        // (same branch selected for source and target won't trigger an update on the commits table)
        clearDefaultDescription();

        var $submitButton = $("#submit-form");

        if (sourceTargetSelector.branchesSelected()) {
            if (sourceTargetSelector.refsAreEqual()) {
                clearCommitsTable();
                clearAUIMessages();
                $createForm.prepend(widget.aui.message.error({
                    content: stash_i18n('stash.web.pull-request.create.branches.equal', 'You cannot merge a branch with itself')
                }));
                $submitButton.attr("disabled", true).addClass("disabled");
            } else {
                clearAUIMessages();
                $loadMoreTrigger.toggleClass('hidden', true);
                $commitsContainer.toggleClass('hidden', false);
                commitsTable.setOptions({'pageSize' : commitTablePreviewPageSize});
                commitsTable.update({suspended:true});
                commitsTable.setOptions({'pageSize' : commitTableFullPageSize});
                $submitButton.removeAttr("disabled").removeClass("disabled");
            }
        } else {
            clearCommitsTable();
            clearAUIMessages();
            $submitButton.attr("disabled", true).addClass("disabled");
        }
    }

    function clearAUIMessages() {
        $createForm
            .find("> .aui-message")
            .remove();
    }

    function clearCommitsTable() {
        $commitsContainer.toggleClass('hidden', true);
        commitsTable.reset();
    }

    /**
     * Depends on sourceTargetSelector already having been initialised
     * @param targetRepo Repository object for target
     * @param sourceRepo Repository object for source
     */
    function initPageState(targetRepo, sourceRepo) {
        var targetBranch = sourceTargetSelector.getTargetBranch();
        var sourceBranch = sourceTargetSelector.getSourceBranch();

        pageState.setRepository(targetRepo);
        pageState.setProject(targetRepo.getProject());
        pageState.extend('sourceRepository');
        pageState.setSourceRepository(sourceRepo);
        pageState.extend('targetBranch');
        pageState.setTargetBranch(targetBranch);
        pageState.extend('sourceBranch');
        pageState.setSourceBranch(sourceBranch);

        events.on('stash.feature.repository.sourceTargetSelector.source.repositoryChanged', function(repository) {
            pageState.setSourceRepository(repository);
            pageState.setSourceBranch(null);
        });

        events.on('stash.feature.repository.sourceTargetSelector.target.repositoryChanged', function(repository) {
            pageState.setRepository(repository);
            pageState.setProject(repository.getProject());
            pageState.setTargetBranch(null);
        });

        events.on('stash.feature.repository.sourceTargetSelector.source.revisionRefChanged', function(branch) {
            pageState.setSourceBranch(branch);
        });

        events.on('stash.feature.repository.sourceTargetSelector.target.revisionRefChanged', function(branch) {
            pageState.setTargetBranch(branch);
        });
    }

    function initMentionableTextarea($container) {
        this.mentionableTextarea = new MentionableTextarea({
            selector: '.pull-request-description textarea',
            $container: $container
        });
    }

    function initDescriptionPreview() {
        markupPreview.bindTo($createForm);
        $createForm.submit(function() {
            markupPreview.hideIfVisible($createForm);
        });
    }

    function initDirtyTracking() {
        var $title = $("#title"),
            $description = $("#description");

        $title.val() && $title.attr('data-dirty', true);
        $description.val() && $description.attr('data-dirty', true);

        dirtyTracker.track({container: '.pull-request-details'});
    }

    exports.onReady = function(repositoryJSON, sourceRepositoryJSON, additionalPreloadRepositories, submittedData) {
        additionalPreloadRepositories = _.map(additionalPreloadRepositories, function(repoJSON){
            return new Repository(repoJSON);
        });
        var targetRepo = new Repository(repositoryJSON);
        var sourceRepo = new Repository(sourceRepositoryJSON);
        initSourceTargetSelector($('.source-target-selector'), sourceRepo, targetRepo, additionalPreloadRepositories);
        // Page state depends on sourceTargetSelector - make sure it comes after.
        initPageState(targetRepo, sourceRepo);
        initDirtyTracking();
        initMetaDataGenerator();
        initMentionableTextarea($('.pull-request-details'));
        initCommitsTable();
        initDescriptionPreview();
        var currentUser = pageState.getCurrentUser();
        new UserMultiSelector($('#reviewers'), {
            initialItems: submittedData.reviewers,
            excludedItems: currentUser ? [currentUser.toJSON()] : []
        });
    };
});
