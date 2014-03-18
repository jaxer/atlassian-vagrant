define('feature/user/group-multi-selector', [
    'aui',
    'jquery',
    'util/navbuilder',
    'widget/searchable-multi-selector'
], function(
    AJS,
    $,
    nav,
    SearchableMultiSelector) {

    function getGroupName(groupOrGroupName) {
        return typeof groupOrGroupName === 'string' ? groupOrGroupName : groupOrGroupName.name;
    }

    function GroupMultiSelector($field, options) {
        SearchableMultiSelector.call(this, $field, options);
    }

    $.extend(true, GroupMultiSelector.prototype, SearchableMultiSelector.prototype, {
        defaults: {
            hasAvatar: true,
            url: nav.rest().groups().build(),
            selectionTemplate: function(group) {
                return stash.widget.groupAvatarWithName({
                    size: 'xsmall',
                    name: getGroupName(group)
                });
            },
            resultTemplate: function(group) {
                return stash.widget.groupAvatarWithName({
                    size: 'small',
                    name: getGroupName(group)
                });
            },
            generateId: getGroupName,
            generateText: getGroupName,
            inputTooShortTemplate: function defaultInputTooShortTemplate() {
                return AJS.escapeHtml(stash_i18n('stash.web.group.multi.selector.help', 'Start typing to search for groups'));
            },
            noMatchesTemplate: function defaultNoMatchesTemplate() {
                return AJS.escapeHtml(stash_i18n('stash.web.group.multi.selector.no.match', 'No matching groups found'));
            }
        }
    });

    return GroupMultiSelector;
});
