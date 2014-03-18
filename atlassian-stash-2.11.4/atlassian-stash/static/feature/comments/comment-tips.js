define('feature/comments/comment-tips', function () {

    "use strict";

    var isMac = navigator.platform.indexOf('Mac') !== -1;

    return {
        tips : [
            isMac ?
                stash_i18n('stash.web.comment.tip.cmdEnter', '⌘ + Enter to post your comment') :
                stash_i18n('stash.web.comment.tip.ctrlEnter', 'Ctrl + Enter to post your comment'),
            stash_i18n('stash.web.comment.tip.mention', 'Type \'\'@\'\' to mention other users'),
            stash_i18n('stash.web.comment.tip.markdown', 'You can use {0}Markdown{1} in comments', "<a href=cav_help_url('stash.help.markup.syntax.guide') target=\"_blank\">", '</a>')
        ]
    };
});
