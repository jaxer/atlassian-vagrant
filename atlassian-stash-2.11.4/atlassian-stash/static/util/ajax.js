define('util/ajax', [
    'aui',
    'jquery',
    'underscore',
    'util/error',
    'util/function',
    'util/navbuilder',
    'widget/error-dialog',
    'model/page-state',
    'exports'
], function(
    AJS,
    $,
    _,
    errorUtil,
    fn,
    navbuilder,
    ErrorDialog,
    pageState,
    exports
) {

    'use strict';

    $.ajaxSetup({
        timeout: 60000
    });


    var errorDialogIsOpen = false;

    function afterCountdown($countdownTimeHolder, intervalMs, endDate, afterCountdownFunc) {
        var now = new Date();

        if (now < endDate) {
            var onSecondsChanged = function() {
                    var secondsLeft = Math.ceil((+endDate - +new Date()) / intervalMs);
                    if (secondsLeft <= 0) {
                        clearInterval(intervalId);
                        afterCountdownFunc();
                    } else {
                        $countdownTimeHolder.text(secondsLeft);
                    }
                },
                intervalId = setInterval(onSecondsChanged, intervalMs);

            onSecondsChanged();
        } else {
            afterCountdownFunc();
        }
    }

    function hideUntilCountdown($el, $replacementEl, $countdownTimeHolder, intervalMs, endDate) {
        var now = new Date();

        if (now < endDate) {
            $el.addClass('hidden');
            $el.before($replacementEl);

            afterCountdown($countdownTimeHolder, intervalMs, endDate, function() {
                $replacementEl.remove();
                $el.removeClass('hidden');
            });
        }
    }

    /**
     * Adds on global error handling to an ajax request.
     *
     * If the ajax request returns with global errors, they will be displayed to the user, and the xhr promise will be rejected.
     *
     * If the error is something that can be fixed with a retry, the error will be displayed, but the xhr promise will NOT be resolved or rejected.
     * Instead, progress callbacks will be called with 'stalled' as the argument. If the user attempts a retry, progress
     * callbacks will be called with 'unstalled' and the result of a retry request will be used to resolve or reject the original xhr promise.
     *
     * @param jqXhr the ajax request to handle global errors for
     * @param ajaxOptions the options object used in the call to $.ajax.  These options are reused if the request needs to be retried.
     */
    function ajaxPipe(jqXhr, ajaxOptions, statusHandlers, isRest) {

        var pipedXhr,
            latestXhr,
            latestAbort;

        function updateLatest(jqXhr) {
            latestXhr = jqXhr;
            latestAbort = latestXhr.abort;
            latestXhr.abort = abort;
        }

        function abort() {
            latestAbort.apply(latestXhr, arguments);
        }

        function handleError(error, data, textStatus, jqXhr, errorThrown, ajaxOptions, isRest) {

            if (error.shouldLogin) {
                // Ideally at this point we want to run as little code as we can to redirect to the log in page ASAP
                // with as little interference as possible.
                window.onbeforeunload = null;
                window.location.href = navbuilder.login().next(window.location.href).build();
                return $.Deferred(); // don't resolve|reject
            }

            if (data) {
                delete data.errors;
            }

            var errorDialog;
            if (!errorDialogIsOpen) {
                errorDialog = new ErrorDialog();
            }

            var deferredToReturn = error.shouldRetry && !errorDialogIsOpen ?
                                   $.Deferred() :
                                   $.Deferred().rejectWith(this, [jqXhr, textStatus, errorThrown, data, errorDialog]);

            if (!errorDialogIsOpen) {

                var extraPanelContent = '',
                    needsRetryCountdown = false;

                var errorHtml = stash.widget.errorContent(error);

                errorDialog.addHideListener(function() {
                    errorDialogIsOpen = false;
                });

                var dialogOptions = {
                    id: 'ajax-error',
                    titleText: error.title,
                    titleClass: error.titleClass || 'error-header',
                    showCloseButton : _.isUndefined(error.canClose) ? true : error.canClose,
                    closeOnOutsideClick : false
                };

                if (error.fallbackUrl) {
                    dialogOptions.okButtonText = AJS.escapeHtml(error.fallbackTitle);

                    errorDialog.addOkListener(function(e) {

                        window.location.href = error.fallbackUrl;

                        e.preventDefault();
                    });

                } else if (error.shouldReload) {
                    dialogOptions.okButtonText = AJS.escapeHtml(stash_i18n('stash.web.ajax.reload', "Reload the page"));

                    errorDialog.addOkListener(function(e) {

                        window.location.reload();

                        e.preventDefault();
                    });

                } else if (error.shouldRetry) {
                    deferredToReturn.notify('stalled');

                    if (error.retryAfterDate) {

                        if (+error.retryAfterDate - +new Date() > 60 * 60 * 1000) {
                            extraPanelContent = stash_i18n('stash.web.retry.later', "Unfortunately, the server won't be available for over an hour.");
                        } else {
                            needsRetryCountdown = true;
                        }
                    }

                    dialogOptions.okButtonText = AJS.escapeHtml(stash_i18n('stash.web.ajax.try.again', "Try again"));

                    var retryXhr;
                    errorDialog.addOkListener(function(e) {

                        deferredToReturn.notify('unstalled');

                        errorDialog.remove();

                        retryXhr = ajax(ajaxOptions, isRest);

                        updateLatest(retryXhr);

                        // pipe results from the retryXhr straight to the deferredToReturn
                        retryXhr.done(function() { return deferredToReturn.resolveWith(this, arguments); });
                        retryXhr.fail(function() { return deferredToReturn.rejectWith(this, arguments); });

                        e.preventDefault();
                    });

                    errorDialog.addHideListener(function() {
                        if (deferredToReturn.state() === 'pending' && !retryXhr) {
                            deferredToReturn.rejectWith(this, [jqXhr, textStatus, errorThrown, data]);
                        }
                    });
                } else {
                    // if the Ok button doesn't do anything but close the dialog, hide the second Close button.
                    dialogOptions.showCloseButton = false;
                }

                dialogOptions.panelContent = '<p>' + errorHtml + extraPanelContent + '</p>';

                errorDialog.reinit(dialogOptions).show();
                errorDialogIsOpen = true;

                if (needsRetryCountdown) {

                    var intervalMs, retryInHtml;
                    if (+error.retryAfterDate - +new Date() > 60 * 1000) {
                        retryInHtml = stash_i18n('stash.web.retry.in.x.minutes', 'Retry in {0}m{1}', '<time><span></span>', '</time>');
                        intervalMs = 60 * 1000;
                    } else {
                        retryInHtml = stash_i18n('stash.web.retry.in.x.seconds', 'Retry in {0}s{1}', '<time><span></span>', '</time>');
                        intervalMs = 1000;
                    }

                    var $retryMessage = $('<span>' + retryInHtml + '</span>'),
                        $intervalHolder = $retryMessage.children('time').children();
                    hideUntilCountdown(errorDialog.getOkButton(), $retryMessage, $intervalHolder, intervalMs, error.retryAfterDate);
                }

            }

            return deferredToReturn;
        }

        function xhrPipe(data, textStatus, jqXhr, errorThrown, customHandler, fallbackFunc) {

            var error = isRest ?
                        errorUtil.getDominantRESTError(data, jqXhr) :
                        errorUtil.getDominantAJAXError(jqXhr),
                handleErrors = true;

            if (customHandler) {
                var ret = customHandler(error);

                // custom handler can return a deferred which will be piped through. We won't handle errors
                if (ret && typeof ret.promise === 'function') {
                    return ret.promise(jqXhr);
                }

                // custom handler can return a replacement error object which will replace the one we generate
                if (ret && _.isObject(ret)) {
                    error = ret;
                }

                // if the custom handler returns false, we won't handle errors,
                // and will simply fallback to normal behavior
                handleErrors = ret !== false;
            }

            if (handleErrors && error) {
                return handleError(error, data, textStatus, jqXhr, errorThrown, ajaxOptions, isRest);

            } else {
                return fallbackFunc();
            }
        }

        function getStatusHandler(status) {
            var customHandler = statusHandlers[status];
            if (customHandler === undefined || customHandler === null) {
                customHandler = statusHandlers['*'];
            }
            if (typeof customHandler === 'function') {
                return customHandler;
            } else {
                // Allow status handlers to be non-functions (ie false), which should always be returned
                return fn.constant(customHandler);
            }
        }

        function done(data, textStatus, jqXhr) {

            var self = this;

            var customHandler = getStatusHandler(jqXhr.status),
                callCustomHandler = customHandler ? _.bind(customHandler, self, data, textStatus, jqXhr) : null;

            return xhrPipe(data, textStatus, jqXhr, null, callCustomHandler, function() {
                return $.Deferred().resolveWith(self, [ data, textStatus, jqXhr ]);
            });
        }

        function fail(jqXhr, textStatus, errorThrown) {

            var self = this;
            var data = jqXhr.responseText;

            try {
                data = JSON.parse(data);
            } catch(e) {}

            var customHandler = getStatusHandler(jqXhr.status),
                callCustomHandler = customHandler ? _.bind(customHandler, self, jqXhr, textStatus, errorThrown, data) : null;

            return xhrPipe(data, textStatus, jqXhr, errorThrown, callCustomHandler, function() {
                return $.Deferred().rejectWith(self, [ jqXhr, textStatus, errorThrown, data ]);
            });
        }

        updateLatest(jqXhr);

        pipedXhr = jqXhr.then(done, fail);

        // return the original xhr, but with the piped done|fail|notify methods.
        return pipedXhr.promise(jqXhr);
    }

    function ajax(options, internalIsRest) {
        var statusHandlers;
        if (options.statusCode) {
            statusHandlers = options.statusCode;
            delete options.statusCode;
        }
        statusHandlers = statusHandlers || {};

        var xhr = ajaxPipe($.ajax(options), options, statusHandlers, internalIsRest);

        xhr.statusCode = function(map) {
            if (map) {
                if (xhr.state() === 'pending') {
                    $.extend(statusHandlers, map);

                } else {
                    for(var prop in map) {
                        if (map.hasOwnProperty(prop)) {
                            AJS.log('xhr.statusCode() should not be called after the request has completed. ' +
                                    'Your handler will have no affect on the resolution of the request.');
                            break;
                        }
                    }

                    var tmp = map[ xhr.status ];
                    xhr.then( tmp, tmp );
                }
            }
        };

        return xhr;
    }

    function rest(options) {
        var headers = {};
        if (pageState.getCurrentUser()) {
            headers['X-AUSERNAME'] = pageState.getCurrentUser().getName();
            headers['X-AUSERID'] = pageState.getCurrentUser().getId();
        }
        options = $.extend(true, {
            dataType: 'json',
            contentType: 'application/json',
            headers: headers,
            jsonp: false,
            type : "GET"
        }, options);

        if (options.type.toUpperCase() !== 'GET' &&  ($.isPlainObject(options.data) || $.isArray(options.data))) {
            options.data = JSON.stringify(options.data);
        }

        return ajax(options, true);
    }

    // turn form inputs into [{name:'blah', value:'blah'}, ...] with serializeArray,
    // then into { blah: 'blah', ...} via reduce
    function formToJSON($form) {
        // Find all the checked checkboxes with the value 'on' and store them in an object
        var checkboxes = _.reduce($form.find('input[type=checkbox]:checked'), function(obj, entry) {
            var $entry = $(entry);
            // Only process checkboxes with 'on' which is the default for Chrome/Firefox/IE9
            if ($entry.attr('value') === 'on') {
                obj[$entry.attr('name')] = true;
            }
            return obj;
        }, {});
        return _.reduce($form.serializeArray(), function(obj, entry) {
            //paraphrased from http://stackoverflow.com/a/1186309/37685

            var existingVal = obj[entry.name],
                newVal = entry.value === undefined ? '' : entry.value;

            // Override the checkbox value (most likely 'on') with true
            if (checkboxes[entry.name]) {
                newVal = true;
            }

            if (existingVal !== undefined) {
                // make it an array if it's not, since we have multiple values.
                if (!$.isArray(existingVal)) {
                    obj[entry.name] = [ existingVal ];
                }

                // add the new value to the array
                obj[entry.name].push(newVal);

            } else {
                obj[entry.name] = newVal;
            }

            return obj;
        }, {
            //seed with new object
        });
    }

    function poll(options) {
        options = $.extend({
            pollTimeout: 60000,
            interval: 500,
            tick: $.noop
        }, options);
        var paused = false;
        var polling = false;
        var defer = $.Deferred(),
            startTime = new Date().getTime(),
            doPoll = function() {
                // Short circuit if the poller is paused or if it is already polling
                if (paused || polling) {
                    return;
                }
                polling = true;
                rest(options).done(function(data, textStatus, xhr) {
                    var isDone = options.tick(data, textStatus, xhr);
                    if (isDone) {
                        defer.resolveWith(this, [data, textStatus, xhr]);
                    } else if ((new Date().getTime() - startTime) > options.pollTimeout || typeof isDone !== 'undefined') {
                        defer.rejectWith(this, [xhr, textStatus, null, data]);
                    } else {
                        setTimeout(doPoll, options.interval);
                    }
                }).fail(function(xhr, textStatus, errorThrown, data) {
                    defer.rejectWith(this, [xhr, textStatus, errorThrown, data]);
                }).always(function() {
                    polling = false;
                });
            };
        setTimeout(doPoll, options.interval);
        var promise = defer.promise();
        promise.resume = function() {
            if (paused) {
                paused = false;
                doPoll();
            }
        };
        promise.pause = function() {
            paused = true;
        };
        return promise;
    }

    exports.ignore404WithinRepository = function (callback) {
        return {
            '404': function (xhr, testStatus, errorThrown, data, fallbackError) {

                var error = data && data.errors && data.errors.length && data.errors[0];

                if (errorUtil.isErrorEntityWithinRepository(error)) {
                    return callback && callback(data) || false; // don't handle this globally.
                }
            }
        };
    };

    exports.ajax = ajax;
    exports.rest = rest;
    exports.poll = poll;
    exports.formToJSON = formToJSON;
});
