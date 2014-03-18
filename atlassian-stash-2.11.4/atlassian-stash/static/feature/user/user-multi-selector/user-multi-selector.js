define('feature/user/user-multi-selector', [
    'aui',
    'jquery',
    'util/navbuilder',
    'widget/searchable-multi-selector'
], function(
    AJS,
    $,
    nav,
    SearchableMultiSelector) {


    function UserMultiSelector($field, options) {
        SearchableMultiSelector.call(this, $field, options);
    }

    $.extend(true, UserMultiSelector.prototype, SearchableMultiSelector.prototype, {
        defaults: {
            hasAvatar: true,
            url: nav.rest().users().build(),
            selectionTemplate: function(person) {
                return stash.widget.avatarWithName({
                    size: 'xsmall',
                    person: person
                });
            },
            urlParams: {
                avatarSize : stash.widget.avatarSizeInPx({ size: 'xsmall' })
            },
            resultTemplate: function(person) {
                return stash.widget.avatarWithNameAndEmail({
                    size: 'small',
                    person: person
                });
            },
            generateId: function(user) {
                // We only use the name as we may not have access to the id
                return user.name;
            },
            inputTooShortTemplate: function defaultInputTooShortTemplate() {
                return AJS.escapeHtml(stash_i18n('stash.web.user.multi.selector.help', 'Start typing to search for users'));
            },
            noMatchesTemplate: function defaultNoMatchesTemplate() {
                return AJS.escapeHtml(stash_i18n('stash.web.user.multi.selector.no.match', 'No matching users found'));
            }
        }
    });

    return UserMultiSelector;
});
