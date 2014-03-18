define('zero-clipboard', [
    'aui'
], function(
    AJS
) {
    var ZeroClipboard = window.ZeroClipboard;
    ZeroClipboard.setDefaults({
        moviePath: AJS.contextPath() + '/s/' + ZeroClipboard.version + '/_/download/resources/com.atlassian.stash.stash-web-plugin:zero-clipboard/ZeroClipboard.swf',
        useNoCache: false
    });
    return ZeroClipboard;
});

require('zero-clipboard');