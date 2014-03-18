/**
 * Common functionality between the user and the user+group multiselects
 */
define('widget/user-multiselect-commons', [
    'aui',
    'jquery',
    'exports'
], function(
    AJS,
    $,
    exports
) {

    /* Common properties */

    exports.avatarSize = stash.widget.avatarSizeInPx({ size: 'xsmall' });
    exports.containerCssClass = 'users-autocomplete';
    exports.dropdownCssClass = 'users-dropdown';
    exports.fetchLimit = 10;
    exports.minimumInputLength = 1;
    exports.quietMillis = 300;

    /* Common functions */

    exports.filterSearchTerm = function(term){
        return $.trim(term).replace(/^@/, '');
    };

    exports.formatInputTooShort = function() {
        return AJS.escapeHtml(stash_i18n('stash.web.user-multiselect.help', 'Start typing to search for a user'));
    };

    exports.formatUserSelection = function(person) {
        return stash.widget.avatarWithName({
            size: 'xsmall',
            person: person
        });
    };

    exports.formatGroupSelection = function(group) {
        return stash.widget.groupAvatarWithName({
            size: 'xsmall',
            name: group.name
        });
    };

    exports.formatUserResult = function(person) {
        return stash.widget.avatarWithNameAndEmail({
            size: 'small',
            person: person
        });
    };

    exports.formatGroupResult = function(group) {
        return stash.widget.groupAvatarWithName({
            size: 'small',
            name: group.name
        });
    };

    exports.showNoResultsIfAllDisabled = function(formatNoMatches) {
        // Select2 stupidly hides duplicate results, but doesn't recheck and display
        // the "no results" message if all the options are hidden.
        //  so we do that here manually.

        var $results = $('.select2-drop-active > .select2-results');
        if(!$results.length) {
            return;
        }

        // if all results are disabled
        if ($results.children('.select2-result-selectable').length === 0 &&
            $results.children('.select2-disabled').length) {
            $results.append('<li class="select2-no-results">' + formatNoMatches() + '</li>');
        }
    };

});
