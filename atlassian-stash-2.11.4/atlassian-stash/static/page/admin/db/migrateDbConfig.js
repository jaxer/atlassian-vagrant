define('page/admin/db/migrate',
['jquery', 'exports'],
function($, exports) {

    function showSpinner(msg) {
        var $cancel = $("#cancel");

        var $initText = $("<div class='next-text'></div>").text(msg);
        $initText.insertAfter($cancel);

        var $spinner = $("<div class='next-spinner' />");
        $spinner.insertAfter($cancel);
        $spinner.spin("small");

        $cancel.hide();
    }

    exports.onReady = function() {
        $("#test").click(function() {
            showSpinner(stash_i18n("stash.web.admin.database.migration.test", "Testing connection..."));
        });

        $("#submit").click(function() {
            showSpinner(stash_i18n("stash.web.admin.database.migration.migrate", "Preparing migration..."));
        });
    };

});