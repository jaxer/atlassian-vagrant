define('feature/repository/revision-reference-selector', [
    'jquery',
    'underscore',
    'util/ajax',
    'util/events',
    'util/navbuilder',
    'model/page-state',
    'model/revision-reference',
    'model/repository',
    'widget/searchable-selector'
], function(
    $,
    _,
    ajax,
    events,
    nav,
    pageState,
    RevisionReference,
    Repository,
    SearchableSelector
    ) {

    /**
     * A searchable selector for choosing RevisionReferences (branches, tags & commits)
     * @extends {SearchableSelector}
     * @return {RevisionReferenceSelector}  The new RevisionReferenceSelector instance
     *
     * @param {HTMLElement|jQuery}  trigger     The trigger (usually a button) to bind opening the selector to.
     * @param {Object}              options     A hash of options, valid options are specified in RevisionReferenceSelector.prototype.defaults
     */
    function RevisionReferenceSelector(trigger, options){
        return this.init.apply(this, arguments);
    }

    $.extend(RevisionReferenceSelector.prototype, SearchableSelector.prototype);

    /**
     * Add the current revision reference type and the repository to each item in a collection of results.
     * Is used as the dataTransform function on REST and preloaded results.
     * @return {Object} The modified collection of results
     *
     * @param {Object} results The collection of results
     */
    RevisionReferenceSelector.prototype._addRefTypeAndRepositoryToResults = function(results){
        if (results && results.values) {
            var newResults = $.extend(true, {}, results); //Deep clone;
            var refType = this._getCurrentType();

            _.each(newResults.values, _.bind(function(ref){
                if (!ref.type) {
                    ref.type = refType;
                }
                if (!ref.repository) {
                    ref.repository = this.repository && this.repository.toJSON();
                }
            }, this));

            return newResults;
        }

        return results;
    };

    /**
     * Default options.
     * All options can also be specified as functions that return the desired type (except params that expect a function).
     * Full option documentation can be found on SearchableSelector.prototype.defaults
     * @inheritDocs
     *
     * @param {Repository}  repository      The repository that the selector will retrieve revisions from
     * @param {Object}      show            A hash of which tabs to show or hide
     */
    RevisionReferenceSelector.prototype.defaults = $.extend(true, {}, SearchableSelector.prototype.defaults, {
        tabs: [
                {
                    label: 'Branches',
                    type: RevisionReference.type.BRANCH,
                    url: function(){ return this.getBranchesUrl(); },
                    resultsTemplate: stash.feature.repository.revisionReferenceSelectorBranchResults,
                    searchPlaceholder: stash_i18n('stash.web.revisionReferenceSelector.branch.search.placeholder', 'Search for a branch')
                },
                {
                    label: 'Tags',
                    type: RevisionReference.type.TAG,
                    url: function(){ return this.getTagsUrl(); },
                    resultsTemplate: stash.feature.repository.revisionReferenceSelectorTagResults,
                    searchPlaceholder: stash_i18n('stash.web.revisionReferenceSelector.tag.search.placeholder', 'Search for a tag')
                },
                {
                    label: 'Commits',
                    type: RevisionReference.type.COMMIT,
                    url: function(){ return this.getCommitsUrl(); },
                    resultsTemplate: stash.feature.repository.revisionReferenceSelectorCommitResults,
                    searchPlaceholder: stash_i18n('stash.web.revisionReferenceSelector.commit.search.placeholder', 'Search for a commit')
                }
            ],
        queryParamKey: 'filterText',
        namespace: 'revision-reference-selector',
        itemSelectedEvent: 'stash.feature.repository.revisionReferenceSelector.revisionRefChanged',
        itemDataKey: 'revision-ref',
        statusCodeHandlers: ajax.ignore404WithinRepository(),
        triggerContentTemplate: stash.feature.repository.revisionReferenceSelectorTriggerContent,
        extraClasses: 'revision-reference-selector',
        repository: function() { return pageState.getRepository(); },
        show: { branches: true, tags: true, commits: false },
        dataTransform: RevisionReferenceSelector.prototype._addRefTypeAndRepositoryToResults,
        postOptionsInit: function(){ this.setRepository(this._getOptionVal('repository')); }
    });

    /**
     * Initialise the selector
     * @override
     * @return {RevisionReferenceSelector} The initialised RevisionReferenceSelector.
     *
     * @param {HTMLElement|jQuery}  trigger     The trigger (usually a button) to bind opening the selector to.
     * @param {Object}              options     A hash of options, valid options are specified in RevisionReferenceSelector.prototype.defaults
     */
    RevisionReferenceSelector.prototype.init = function(trigger, options){
        SearchableSelector.prototype.init.apply(this, arguments);

        return this;
    };

    /**
     * Merge the supplied options with the defaults and remove tabs that aren't going to be shown.
     * @override
     *
     * @param {Object}  options A hash of options, valid options are specified in RevisionReferenceSelector.prototype.defaults
     */
    RevisionReferenceSelector.prototype.setOptions = function(options){
        if (options.extraClasses) {
            options.extraClasses = this.defaults.extraClasses + ' ' + $.trim(options.extraClasses);
        }
        options = $.extend(true, {}, this.defaults, options);
        var typesMap ={
            branches: RevisionReference.type.BRANCH.id,
            tags: RevisionReference.type.TAG.id,
            commits: RevisionReference.type.COMMIT.id
        };
        var typesToShow = _.filter(typesMap, function(type, key){
            //Only show types with enabled in the `show` options.
            return options.show[key];
        });

        //Remove any tabs whose type is not in `typesToShow`
        options.tabs = _.filter(options.tabs, function(tab){
            return _.indexOf(typesToShow, tab.type.id) !== -1;
        });

        this.options = options;
    };

    /**
     * Build a RevisionReference from the metadata on the trigger.
     * @override
     * @return {RevisionReference} The newly created RevisionReference
     */
    RevisionReferenceSelector.prototype._getItemFromTrigger = function(){
        var $triggerItem = this.$trigger.find('.name');

        return new RevisionReference($.extend({},
            this._buildObjectFromElementDataAttributes($triggerItem),
            {
                displayId: $triggerItem.text(),
                repository: this.repository
            }
        ));
    };

    /**
     * Get the url for the branches REST endpoint for the current repository
     * @return  {string}    The url to the rest endpoint for branches
     */
    RevisionReferenceSelector.prototype.getBranchesUrl = function(){
        return nav.rest().project(this.repository.getProject()).repo(this.repository).branches().build();
    };

    /**
     * Get the url for the tags REST endpoint for the current repository
     * @return  {string}    The url to the rest endpoint for tags
     */
    RevisionReferenceSelector.prototype.getTagsUrl = function(){
        return nav.rest().project(this.repository.getProject()).repo(this.repository).tags().build();
    };

    /**
     * Get the url for the commits REST endpoint for the current repository
     * @return  {string}    The url to the rest endpoint for commits
     */
    RevisionReferenceSelector.prototype.getCommitsUrl = function(){
        return nav.rest().project(this.repository.getProject()).repo(this.repository).commits().build();
    };

    /**
     * Get the current repository
     * @return {Repository}     The current repository
     */
    RevisionReferenceSelector.prototype.getRepository = function() {
        return this.repository;
    };

    /**
     * Update the current repository.
     * Resets state for the current scrollable and trigger and hides the dialog.
     *
     * @param {Repository}  repository  The new repository
     */
    RevisionReferenceSelector.prototype.setRepository = function(repository) {
        var currentRepository = this.repository;

        if (repository instanceof Repository && !repository.isEqual(currentRepository)) {
            //Changing repository to the same repository should be a no-op.
            this.repository = repository;

            if (currentRepository) {
                //Only reset the scrollable and trigger, close the dialog and trigger the event when we are changing between repositories, not setting the repo for the first time.
                var currentScrollable = this._getCurrentScrollable();

                if (currentScrollable) {
                    //We don't call _populateScrollable, because after changing repository it doesn't make sense to show the preload data
                    this._emptyScrollable(currentScrollable);
                    currentScrollable.init();
                }
                this.clearSelection();
                this.dialog.hide();

                events.trigger('stash.feature.repository.revisionReferenceSelector.repoChanged', this, repository, this._getOptionVal('context'));
            }
        }
    };

    /**
     * Get the RevisionReference type of the current tab.
     * @return {Object} The current tab type
     */
    RevisionReferenceSelector.prototype._getCurrentType = function(){
        return this.tabs[this.currentTabId || 0].type;
    };

    /**
     * Set the selected item.
     * Updates the trigger and fires the event if the item is different to the previous item.
     * @override
     *
     * @param {Object} revisionRef The RevisionReference to select.
     */
    RevisionReferenceSelector.prototype.setSelectedItem = function(revisionRef){
        if (revisionRef instanceof RevisionReference && !revisionRef.isEqual(this._selectedItem)) {
            this._itemSelected(revisionRef);
        }
    };

    /**
     * Handle an item being selected.
     * This creates a new RevisionReference from the item data,
     * triggers the 'stash.feature.repository.revisionReferenceSelector.revisionRefChanged' event with the new RevisionReference,
     * sets the selectedItem to the new RevisionReference and updates the trigger and form field (if supplied)
     * @override
     *
     * @param {Object|RevisionReference}  refDataOrRevisionReference     The JSON data or a RevisionReference for the selected item.
     */
    RevisionReferenceSelector.prototype._itemSelected = function(refDataOrRevisionReference){
        var refData;
        var ref;

        if (refDataOrRevisionReference instanceof RevisionReference) {
            refData = refDataOrRevisionReference.toJSON();
            ref = refDataOrRevisionReference;
        } else {
            refData = _.pick(refDataOrRevisionReference, _.keys(RevisionReference.prototype.namedAttributes));
            ref = new RevisionReference(refData);
        }

        this._selectedItem = ref;

        if (this._getOptionVal('field')) {
            $(this._getOptionVal('field')).val(refData.id);
        }

        this.updateTrigger({ref: refData});

        events.trigger(this._getOptionVal('itemSelectedEvent'), this, ref, this._getOptionVal('context'));
    };

    return RevisionReferenceSelector;
});
