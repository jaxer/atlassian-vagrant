define('feature/repository/branch-selector-field-internals', [
    'jquery',
    'underscore',
    'util/events',
    'model/revision-reference',
    'widget/searchable-selector',
    'feature/repository/revision-reference-selector'
], function (
    $,
    _,
    events,
    RevisionReference,
    SearchableSelector,
    RevisionReferenceSelector
    ) {
    // HACK: We don't know when these fields might get removed from the DOM. In order to prevent memory leaks,
    // I'm destroying obsolete inputs when certain events happen.
    var fields = [];
    function destroyRemovedFields() {
        var newFields = [];
        var i = fields.length;
        while(i--) {
            if (!fields[i].$input.closest(document.body).length) {
                fields[i].destroy();
            } else {
                newFields.push(fields[i]);
            }
        }
        fields = newFields;
    }
    $(document).bind('hideLayer', function() {
        // Without timeout the dialogs aren't removed
        setTimeout(destroyRemovedFields, 0);
    });

    function processPreloadData(preloadData) {
        if (!preloadData || !_.isArray(preloadData)) {
            return null;
        }
        // inflate type for each item
        _.each(preloadData, function(item) {
            var realType = RevisionReference.type.from(item.type);
            if (realType != null) {
                item.type = realType;
            }
        });
        return SearchableSelector.constructDataPageFromPreloadArray(preloadData);
    }

    events.on('stash.widget.branchselector.inputAdded', function(id, options) {
        $(document).ready(function() {
            var $input;

            function initBranchSelectorField() {
                $input = $input.length ? $input : $('#' + id);

                if (!$input.length) {
                    console.log('Branch selector field (#' + id + ') was not found and not initialised. See https://jira.atlassian.com/browse/STASH-3914');
                }
                var $removeSelection = $input.nextAll('.remove-link');
                var preloadedRefs = processPreloadData(options.preloadData);
                var revisionReferenceSelector = new RevisionReferenceSelector($input.prevAll('.branch-selector-field'), {
                    context: id,
                    field: $input,
                    triggerPlaceholder: options.triggerPlaceholder,
                    show: { tags: options.showTags },
                    preloadData: preloadedRefs,
                    extraClasses: options.extraClasses
                });
                if (options.revisionId) {
                    var fromPreloadData = preloadedRefs && _.findWhere(preloadedRefs.values, {id: options.revisionId});
                    if (fromPreloadData) {
                        revisionReferenceSelector.setSelectedItem(new RevisionReference({id: fromPreloadData.id,
                            displayId: fromPreloadData.displayId,
                            type: fromPreloadData.type,
                            isDefault: false})
                        );
                    } else {
                        revisionReferenceSelector.setSelectedItem(RevisionReference.hydrateRefFromId(options.revisionId));
                    }
                }
                $removeSelection.click(function (e) {
                    e.preventDefault();
                    revisionReferenceSelector.clearSelection();
                    $removeSelection.addClass('hidden');
                });
                var refChangedHandler = function (revisionRef) {
                    if (this === revisionReferenceSelector) {
                        $input.val(revisionRef ? revisionRef.getId() : '');

                        if (revisionRef.getType().id === RevisionReference.type.TAG.id) {
                            $removeSelection.text(stash_i18n('stash.web.branch-selector.remove.tag', 'Remove tag'));
                        } else {
                            $removeSelection.text(stash_i18n('stash.web.branch-selector.remove.branch', 'Remove branch'));
                        }
                        $removeSelection.toggleClass('hidden', !revisionRef);
                    }
                };
                events.on('stash.feature.repository.revisionReferenceSelector.revisionRefChanged', refChangedHandler);
                fields.push({
                    $input: $input,
                    destroy: function () {
                        events.off('stash.feature.repository.revisionReferenceSelector.revisionRefChanged', refChangedHandler);
                        revisionReferenceSelector.destroy();
                        revisionReferenceSelector = null;
                    }
                });
            }

            $input = $('#' + id);
            if ($input.length) {
                initBranchSelectorField();
            } else {
                _.defer(initBranchSelectorField);
            }
        });
    });
});
require('feature/repository/branch-selector-field-internals');
