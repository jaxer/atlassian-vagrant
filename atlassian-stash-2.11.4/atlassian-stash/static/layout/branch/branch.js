define('layout/branch', [
    'jquery',
    'underscore',
    'util/events',
    'util/navbuilder',
    'model/page-state',
    'feature/repository/revision-reference-selector',
    'exports'
], function(
    $,
    _,
    events,
    nav,
    pageState,
    RevisionReferenceSelector,
    exports
    ) {

        exports.onReady = function(revisionSelector) {
            var addUrlToResults = function(results) {
                results = RevisionReferenceSelector.prototype._addRefTypeAndRepositoryToResults.call(this, results);

                var uri = nav.parse(window.location.href);

                _.each(results.values, function(ref) {
                    if (!ref.url) {
                        var refUri = uri.clone();
                        refUri.replaceQueryParam('at', ref.id);
                        ref.url = refUri.query() + (refUri.anchor() ? refUri.anchor() : '' );
                    }
                });

                return results;
            };

            var revisionReferenceSelector = new RevisionReferenceSelector($(revisionSelector), {
                id: 'repository-layout-revision-selector-dialog',
                dataTransform: addUrlToResults
            });

            pageState.setRevisionRef(revisionReferenceSelector.getSelectedItem());

            /* Cascade changes upward */
            events.on('stash.feature.repository.revisionReferenceSelector.revisionRefChanged', function(revisionReference) {
                if (this === revisionReferenceSelector) {
                    events.trigger('stash.layout.branch.revisionRefChanged', this, revisionReference);
                    pageState.setRevisionRef(revisionReferenceSelector.getSelectedItem());
                }
            });

            /* React to page changes */
            events.on('stash.page.*.revisionRefChanged', function(revisionReference) {
                revisionReferenceSelector.setSelectedItem(revisionReference);
            });

            events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
                keyboardShortcuts.enableContext('branch');
            });

            $('#branch-actions-menu')
                .on('aui-dropdown2-show', function() {
                    events.trigger('stash.layout.branch.actions.dropdownShown');
                    // Focus dropdown2 trigger because if coming from an open branch-selector, the hidecallback will focus
                    // the branch selector trigger, hiding the branch-actions dropdown
                    $('#branch-actions').focus();
                    // dropdown items are client-web-items
                    $(this).html(stash.layout.branch.actionsDropdownMenu({
                        repository: pageState.getRepository().toJSON(),
                        atRevisionRef: pageState.getRevisionRef().toJSON()
                    }));
                }).on('aui-dropdown2-hide', function() {
                    events.trigger('stash.layout.branch.actions.dropdownHidden');
                });
        };
    });
