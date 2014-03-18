define('util/navigator', [
    'exports'
], function (
    exports
    ) {

    'use strict';

    var userAgent = window.navigator.userAgent;
    var platform = window.navigator.platform;

    exports._getUserAgent = function() { return userAgent; };
    exports._getPlatform =  function() { return platform; };
});
