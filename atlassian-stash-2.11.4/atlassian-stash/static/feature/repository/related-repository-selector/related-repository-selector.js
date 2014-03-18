define('feature/repository/related-repository-selector', [
    'jquery',
    'model/page-state',
    'util/navbuilder',
    'feature/repository/base-repository-selector'
], function (
    $,
    pageState,
    navbuilder,
    BaseRepositorySelector
) {

    /**
     * A searchable selector for choosing Repositories
     * @extends {SearchableSelector}
     * @return {RelatedRepositorySelector}  The new RelatedRepositorySelector instance
     *
     * @param {HTMLElement|jQuery}  trigger     The trigger (usually a button) to bind opening the selector to.
     * @param {Object}              options     A hash of options, valid options are specified in RelatedRepositorySelector.prototype.defaults
     */
    function RelatedRepositorySelector(trigger, options) {
        return this.init.apply(this, arguments);
    }

    $.extend(RelatedRepositorySelector.prototype, BaseRepositorySelector.prototype);

    RelatedRepositorySelector.constructDataPageFromPreloadArray = BaseRepositorySelector.constructDataPageFromPreloadArray;

    /**
     * Default options.
     * All options can also be specified as functions that return the desired type (except params that expect a function).
     * Full option documentation can be found on SearchableSelector.prototype.defaults
     * @inheritDocs
     *
     * @param repository {Repository} The repository for which to select related repositories.
     */
    RelatedRepositorySelector.prototype.defaults = $.extend(true, {}, BaseRepositorySelector.prototype.defaults, {
        repository : function() { return pageState.getRepository(); },
        preloadData : function() {
            var repo = this._getOptionVal('repository') || pageState.getRepository();

            if (!repo) {
                return null;
            }

            var preload = [ repo.toJSON() ];

            var origin = repo.getOrigin();
            if (origin) {
                preload.push(origin);
            }

            return RelatedRepositorySelector.constructDataPageFromPreloadArray(preload);
        },
        url: function() {
            var repo = this._getOptionVal('repository') || pageState.getRepository();
            return navbuilder.rest().project(repo.getProject()).repo(repo).related().withParams({
                  avatarSize: stash.widget.avatarSizeInPx({ size: 'xsmall' })
              }).build();
        }
    });

    return RelatedRepositorySelector;
});
