define('page/maintenance/lock', [
    'jquery',
    'util/ajax',
    'util/navbuilder',
    'widget/submit-spinner',
    'layout/maintenance',
    'exports'
], function (
    $,
    ajax,
    navBuilder,
    SubmitSpinner,
    maintenance,
    exports
) {
        exports.onReady = function (hasToken) {
            var pollUrl = AJS.contextPath() + '/mvc/maintenance/lock',
                cancelButtonId = 'cancel';
            var opts = {
                pollUrl: pollUrl,
                pollTickCallback: function (progressBar, data, textStatus, xhr) {
                    // always return undefined - never done until the pollUrl returns a 404
                    return undefined;
                },
                cancelButtonId: cancelButtonId,
                redirectUrl: hasToken ? navBuilder.admin().build() : navBuilder.allProjects().build(),
                canceledHeader: stash_i18n('stash.web.lock.canceled.title', 'Stash unlocked'),
                cancelingDescription: stash_i18n('stash.web.lock.canceling.description', 'Unlocking Stash.'),
                hasCancelDialog: false
            };

            $('#' + cancelButtonId).on('click', function (event) {
                var $button = $(this),
                    $form = $button.closest('form'),
                    $tokenField = $form.find('input[name=token]'),
                    token = $tokenField.val(),
                    spinner = new SubmitSpinner($button, 'after');

                spinner.show();

                // Can't use data() because jQuery sends the data as content body instead of query string parameters for
                // all non-GET requests. Encode the token into the query string of the url.
                ajax.rest({
                    url: pollUrl + "?token=" + encodeURIComponent(token),
                    type: 'DELETE',
                    statusCode: {
                        409: function (xhr, textStatus, errorThrown, resp) {
                            $tokenField.parent().replaceWith(stash.layout.maintenance.tokenInputField(resp));
                            return false;
                        },
                        '*': function () {
                            return false;
                        }
                    }
                }).always(function () {
                    spinner.hide();
                }).done(function () {
                    window.location = opts.redirectUrl;
                });

                event.preventDefault();
            });

            maintenance.init(opts);
        };
    });
