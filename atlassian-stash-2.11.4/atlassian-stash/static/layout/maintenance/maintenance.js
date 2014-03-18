define('layout/maintenance', [
    'aui',
    'jquery',
    'util/navbuilder',
    'util/ajax',
    'widget/confirm-dialog',
    'widget/progress-bar',
    'exports'],
    function(AJS,
             $,
             navBuilder,
             ajax,
             ConfirmDialog,
             ProgressBar,
             exports) {

        function showCanceling($trigger, progressBar, opts) {
            $trigger.val(opts.cancelingButtonText).prop('disabled', true).toggleClass('disabled', true);
            progressBar.update({
                message : opts.cancelingDescription,
                percentage : 100
            });
            progressBar.reversed(true);
            progressBar.active(true);
            $('#backup-description').hide();
            $('#content > header > h1').text(opts.canceledHeader);
        }

        function pollingDone(opts) {
            location.href = opts.redirectUrl;
        }

        function pollTickCallback(progressBar, data, textStatus, xhr) {
            if (data.task) {
                if (data.task.state && data.task.state !== 'RUNNING') {
                    return true;
                }

                progressBar.update(data.task.progress);
                if (data.task.progress.percentage === 100) {
                    return true;
                }
            }
            return undefined;
        }

        function pollStatus(opts, progressBar) {
            var canceled = false;

            var promise = ajax.poll({
                url : opts.pollUrl,
                pollTimeout : Infinity,
                interval : 500,
                statusCode: {
                    '404': function() {
                        pollingDone(opts);
                        return false;
                    },
                    // Ignore all other errors
                    '*': function () {
                        return false;
                    }
                },
                tick : function(data, textStatus, xhr) {
                    return opts.pollTickCallback(progressBar, data, textStatus, xhr);
                }
            });
            promise.cancel = function() {
                canceled = true;
            };
            promise.isCancelled = function() {
                return canceled;
            };
            return promise;
        }

        exports.init = function(options) {

            var defaults = {
                pollUrl: AJS.contextPath() + '/mvc/maintenance',
                pollTickCallback: pollTickCallback,
                cancelTriggerSelector: '.cancel-link',
                cancelFormSelector: '.cancel-form',
                progressBarSelector: '#progress',
                redirectUrl: navBuilder.allProjects().build(),
                cancelButtonSelector: '#cancel',
                canceledHeader: stash_i18n('stash.web.maintenance.canceled.title', 'Maintenance Canceled'),
                cancelingButtonText: stash_i18n('stash.web.maintenance.canceling.button', 'Canceling...'),
                cancelingDescription: stash_i18n('stash.web.maintenance.canceling.description', 'Canceling maintenance.'),
                hasCancelDialog: true,
                cancelDialogId: 'cancel-maintenance-dialog',
                cancelDialogTitle: stash_i18n('stash.web.maintenance.dialog.title', 'Performing Maintenance'),
                cancelDialogTitleClass: 'warning-header',
                cancelDialogDescription: stash_i18n('stash.web.maintenance.dialog.description', 'Are you sure you want to cancel maintenance?'),
                cancelDialogButtonText: stash_i18n('stash.web.maintenance.dialog.cancel', 'Cancel maintenance')
            };

            var opts = $.extend({}, defaults, options);

            var $trigger = $(opts.cancelTriggerSelector);
            $trigger.on('click', function (e) {
                $(opts.cancelFormSelector).addClass('visible');
                $trigger.hide();
                e.preventDefault();
            });

            var progressBar = ProgressBar(opts.progressBarSelector);
            var poller = pollStatus(opts, progressBar)
                .done(function(data) {
                    pollingDone(opts);
                });

            if (opts.hasCancelDialog) {
                var cancelDialog = new ConfirmDialog({
                    id : opts.cancelDialogId,
                    titleText: opts.cancelDialogTitle,
                    titleClass : opts.cancelDialogTitleClass,
                    panelContent : $('<p></p>').text(opts.cancelDialogDescription),
                    submitText : opts.cancelDialogButtonText
                });
                cancelDialog.addCancelListener(function() {
                    poller.resume();
                    progressBar.active(true);
                });
                cancelDialog.addConfirmListener(function(promise, $trigger, closeCallback) {
                    poller.cancel();
                    closeCallback();
                    showCanceling($trigger, progressBar, opts);
                });
                cancelDialog.attachTo(opts.cancelButtonSelector, function() {
                    poller.pause();
                    progressBar.active(false);
                });

                $(opts.cancelFormSelector).find('input[name="token"]').each(function() {
                    var $self = $(this);

                    var $cancelButtonSelector = $(opts.cancelButtonSelector);

                    //Set initial disabled state
                    $cancelButtonSelector.prop('disabled', !$.trim($self.val()));
                    $self.on('input', function() {
                        //Change disabled state depending on whether the token field is empty
                        $cancelButtonSelector.prop('disabled', !$.trim($self.val()));
                    });
                });
            }
        };
    });
