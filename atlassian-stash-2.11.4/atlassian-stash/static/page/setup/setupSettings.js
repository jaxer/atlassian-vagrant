define('page/setupSettings', [
    'jquery',
    'aui',
    'util/client-storage',
    'exports'
], function(
    $,
    AJS,
    clientStorage,
    exports
) {
    exports.onReady = function() {
        var setupDataKey = clientStorage.buildKey([AJS.contextPath(), 'setup']),
            setupData = clientStorage.getSessionItem(setupDataKey);

        if (setupData) {
            setupData.applicationTitle && $('#applicationTitle').val(setupData.applicationTitle);
            setupData.baseUrl && $('#baseUrl').val(setupData.baseUrl);
        }

        $('#eval-license').click(function() {
            clientStorage.setSessionItem(setupDataKey, {
                applicationTitle: $('#applicationTitle').val(),
                baseUrl: $('#baseUrl').val()
            });
        });
    };
});
