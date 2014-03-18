define('feature/repository/base-repository-selector', [
    'jquery',
    'model/repository',
    'util/events',
    'widget/searchable-selector'
], function (
    $,
    Repository,
    events,
    SearchableSelector
) {

    /**
     * A searchable selector for choosing Repositories
     * @extends {SearchableSelector}
     * @return {BaseRepositorySelector}  The new BaseRepositorySelector instance
     *
     * @param {HTMLElement|jQuery}  trigger     The trigger (usually a button) to bind opening the selector to.
     * @param {Object}              options     A hash of options, valid options are specified in BaseRepositorySelector.prototype.defaults
     */
    function BaseRepositorySelector(trigger, options) {
        return this.init.apply(this, arguments);
    }
    $.extend(BaseRepositorySelector.prototype, SearchableSelector.prototype);

    BaseRepositorySelector.constructDataPageFromPreloadArray = SearchableSelector.constructDataPageFromPreloadArray;

    /**
     * Default options.
     * All options can also be specified as functions that return the desired type (except params that expect a function).
     * Full option documentation can be found on SearchableSelector.prototype.defaults
     * @inheritDocs
     *
     * @param repository {Repository} The repository for which to select related repositories.
     */
    BaseRepositorySelector.prototype.defaults = $.extend(true, {}, SearchableSelector.prototype.defaults, {
        searchable : false,
        extraClasses: 'base-repository-selector',
        resultsTemplate: stash.feature.repository.baseRepositorySelectorResults,
        triggerContentTemplate: stash.feature.repository.baseRepositorySelectorTriggerContent,
        searchPlaceholder: stash_i18n('stash.web.repositorySelector.search.placeholder', 'Search for a repository'),
        namespace: 'base-repository-selector',
        itemSelectedEvent: 'stash.feature.repository.repositorySelector.repositoryChanged',
        itemDataKey: 'repository'
    });

    /**
     * Build a Repository from the metadata on the trigger.
     * @override
     * @return {Repository} The newly created Repository
     */
    BaseRepositorySelector.prototype._getItemFromTrigger = function(){
        var $triggerItem = this.$trigger.find('.repository');
        return new Repository($.extend({}, this._buildObjectFromElementDataAttributes($triggerItem), {name: $triggerItem.children('.name').text()}));
    };

    /**
     *
     * @param repository
     */
    BaseRepositorySelector.prototype.setSelectedItem = function(repository) {
        if (repository instanceof Repository && !repository.isEqual(this._selectedItem)) {
            this._itemSelected(repository);
        }
    };

    /**
     * Handle an item being selected.
     * This creates a new Repository from the item data,
     * triggers the 'stash.feature.repository.repositorySelector.repositoryChanged' event with the new Repository,
     * sets the selectedItem to the new Repository and updates the trigger and form field (if supplied)
     * @override
     *
     * @param {Object|Repository}  repositoryData     The JSON data or Repository model for the selected item.
     */
    BaseRepositorySelector.prototype._itemSelected = function(repositoryData){
        var repository;
        if (repositoryData instanceof Repository) {
            repository = repositoryData;
            repositoryData = repositoryData.toJSON();
        } else {
            repositoryData = _.pick(repositoryData, _.keys(Repository.prototype.namedAttributes));
            repository = new Repository(repositoryData);
        }
        this._selectedItem = repository;
        if (this._getOptionVal('field')) {
            $(this._getOptionVal('field')).val(repositoryData.id);
        }
        this.updateTrigger({repository: repositoryData});
        events.trigger(this._getOptionVal('itemSelectedEvent'), this, repository, this._getOptionVal('context'));
    };

    return BaseRepositorySelector;
});
