define('page/repository/permissions', [
    'exports',
    'jquery',
    'util/navbuilder',
    'util/ajax',
    'widget/submit-spinner',
    'feature/permission/permission-table'
], function(
    exports,
    $,
    nav,
    ajax,
    SubmitSpinner,
    permissionTable) {
    exports.onReady = function(permissions) {

        var publicAccessCheckbox = $('#public-access-allowed');
        var publicAccessSpinner;
        var currentPublicAccessXHR;

        function setPublicAccess(allow) {
            return ajax.rest({
                type: 'PUT',
                url: nav.rest().currentRepo().build(),
                data: {
                    'public': allow
                }
            });
        }

        publicAccessCheckbox.click(function() {
            var allow = this.checked;
            if (!publicAccessSpinner) {
                publicAccessSpinner = new SubmitSpinner($(this).next('label'));
            }
            if (currentPublicAccessXHR) {
                currentPublicAccessXHR.abort();
            }
            publicAccessSpinner.show();
            currentPublicAccessXHR = setPublicAccess(allow);
            currentPublicAccessXHR.fail(function() {
                publicAccessCheckbox.prop('checked', !allow);
            }).always(function() {
                publicAccessSpinner.hide();
                currentPublicAccessXHR = null;
            });
        });

        permissionTable.initialise(
            nav.currentRepo().permissions(),
            permissions,
            'REPO_ADMIN' //If the user can see this page, then the UI should act like they have project admin permissions
        );

    };
});
