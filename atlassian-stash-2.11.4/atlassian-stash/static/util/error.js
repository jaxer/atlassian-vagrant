define('util/error', [
    'aui',
    'jquery',
    'underscore',
    'model/page-state',
    'util/function',
    'util/navbuilder',
    'exports'
], function(
    AJS,
    $,
    _,
    pageState,
    fn,
    navbuilder,
    exports) {

    'use strict';

    var pageIsLoaded = false,
        latestEscKeyTime = 0;
    $(document).ready(function() {
        pageIsLoaded = true;

        var oldOnBeforeUnload = window.onbeforeunload;
        window.onbeforeunload = function() {
            pageIsLoaded = false;
            return oldOnBeforeUnload ? oldOnBeforeUnload.apply(this, arguments) : undefined;
        };
    }).on('keydown', function(e) {
        if (e.keyCode === AJS.keyCode.ESCAPE) {
            latestEscKeyTime = new Date().getTime();
        }
    });

    exports.showNonFieldErrors = function(errors) {
        //TODO move to Soy and i18n it.
        var $notificationSection = $('#content > header > .notifications').empty();
        if (typeof(errors) === 'string'){
            appendError($notificationSection, errors);
        } else if (errors && errors.length) {
            var nonFieldErrors = _.filter(errors, fn.not(fn.pluck('context')));

            if (nonFieldErrors.length) {
                _.each(nonFieldErrors, function(error) {
                    var errorText = (error && error.message) ? error.message : error;
                    appendError($notificationSection, errorText);
                });
            }
        } else {
            appendError($notificationSection, stash_i18n('stash.web.unknownerror', 'Unknown error has occurred.'));
        }
    };

    var appendError = function ($container, errorText) {
        $(widget.aui.message.error({
            content: AJS.escapeHtml(errorText)
        })).appendTo($container);
    };

    // TODO - our error handling needs some error codes to avoid this kind of heuristic stuff.
    // or perhaps a rawError.entityType field?
    exports.isErrorEntityWithinRepository = function(rawError) {
        return rawError && /branch|tag|repository object|changeset|revision|comment/i.test(rawError.message);
    };

    exports.level = {
        INFO : "INFO", // currently unused
        WARNING : "WARNING", // currently unused
        ERROR : "ERROR",
        SUCCESS : "SUCCESS" // currently unused
    };

    function ErrorBuilder(title, message, details, context, level) {
        this._out = {
            title : title,
            message : message,
            details : details,
            context : context,
            level : level || exports.level.ERROR,
            fallbackUrl : undefined,
            fallbackTitle : undefined,
            shouldLogin : false,
            shouldReload : false,
            canRetry : false,
            shouldRetry : false,
            retryAfterDate : undefined
        };
    }

    ErrorBuilder.prototype.title = function(title) {
        this._out.title = title;
        return this;
    };

    ErrorBuilder.prototype.message = function(message) {
        this._out.message = message;
        return this;
    };

    ErrorBuilder.prototype.details = function(details) {
        this._out.details = details;
        return this;
    };

    ErrorBuilder.prototype.context = function(context) {
        this._out.context = context;
        return this;
    };

    ErrorBuilder.prototype.level = function(level) {
        this._out.level = level || exports.level.ERROR;
        return this;
    };

    ErrorBuilder.prototype.shouldLogin = function() {
        this._out.shouldLogin = true;
        return this;
    };

    ErrorBuilder.prototype.shouldReload = function() {
        this._out.shouldReload = true;
        return this;
    };

    ErrorBuilder.prototype.shouldRetry = function() {
        this._out.shouldRetry = true;
        return this.canRetry();
    };

    ErrorBuilder.prototype.canRetry = function() {
        this._out.canRetry = true;
        return this;
    };

    ErrorBuilder.prototype.fallbackUrl = function(url, title) {
        this._out.fallbackUrl = url;
        this._out.fallbackTitle = title;
        return this;
    };

    ErrorBuilder.prototype.retryAfterDate = function(date) {
        // check for invalid date
        this._out.retryAfterDate = isNaN(date) ? undefined : date;

        if (this._out.retryAfterDate) {
            this.shouldRetry();
        }

        return this;
    };

    ErrorBuilder.prototype.doAccessDenied = function(isLoggedIn) {

        this.title(this._out.title || titleForStatusCode['401']);

        if (isLoggedIn) { // They specifically don't have permission.
            this.message(this._out.message || stash_i18n("stash.web.error.no.permission", "You aren''t allowed to see this. Your project or system administrator will need to grant you permission."));
            this.fallbackUrl(navbuilder.allProjects().build(), stash_i18n("stash.web.ajax.back.to.projects", "Back to Projects"));

        } else {
            this.message(this._out.message || stash_i18n('stash.web.error.anonymous.disallowed', "Anonymous users aren''t allowed to see this."));
            this.shouldLogin();
        }

        return this;
    };

    ErrorBuilder.prototype.doServerDown = function() {

        this.title(this._out.title || titleForStatusCode['0']);
        this.message(this._out.message || messageForStatusCode['0']);

        this.canRetry();

        return this;
    };

    ErrorBuilder.prototype.doRequestThrottled = function(retryAfterValue) {

        this.title(this._out.title || titleForStatusCode['503']);
        this.message(this._out.message || messageForStatusCode['503']);

        this.canRetry();
        this.retryAfterDate(!isNaN(Number(retryAfterValue)) ?
                            new Date( new Date().getTime() + (1000 * Number(retryAfterValue))) : // value in ms
                            new Date(Date.parse(retryAfterValue))); // date string

        return this;
    };

    ErrorBuilder.prototype.doNotFound = function(optFallbackUrl, optFallbackTitle) {

        this.title(this._out.title || titleForStatusCode['404']);
        this.message(this._out.message || messageForStatusCode['404']);

        this.fallbackUrl(
            optFallbackUrl   || this._out.fallbackUrl   || navbuilder.allProjects().build(),
            optFallbackTitle || this._out.fallbackTitle || stash_i18n('stash.web.ajax.back.to.projects', "Back to Projects"));

        return this;
    };

    ErrorBuilder.prototype.build = function() {
        if (!this._out.title) {
            this.title(stash_i18n('stash.web.dialog.ajax.error.title', 'An error occurred'));
        }

        return this._out;
    };

    var titleForStatusCode = {
        '401' : stash_i18n('stash.web.dialog.ajax.error.not.permitted.title', 'User not permitted'),
        '404' : stash_i18n('stash.web.couldnt.find.title', "Page not found"),
        '502' : stash_i18n('stash.web.server.unreachable.title', "Server Unreachable"),
        '0'   : stash_i18n('stash.web.server.unreachable.title', "Server Unreachable"),
        '503' : stash_i18n('stash.web.server.busy.title', "Server Busy")
    };

    var messageForStatusCode = {
        '404' : stash_i18n('stash.web.couldnt.find', "We couldn''t find the page you requested."),
        '502' : stash_i18n('stash.web.error.server.unresponsive', "The server didn''t respond. You may retry your request when the server comes back up."),
        '0'   : stash_i18n('stash.web.error.server.unresponsive', "The server didn''t respond. You may retry your request when the server comes back up."),
        '503' : stash_i18n('stash.web.error.too.much.load', "The server couldn''t process your request, please try again later.")
    };

    function isSuccessHttpCodeRange(status) {
        return status >= 200 && status < 400;
    }

    // IE sucks.
    // Discussion at http://stackoverflow.com/questions/4268931/xmlhttprequest-response-has-no-headers-in-internet-explorer
    function shouldIgnoreLoggedOutUser(jqXhr, status) {
        return status === 204 && $.browser.msie && !jqXhr.getAllResponseHeaders();
    }

    function handlePermissionErrorsFromUserChanging(jqXhr, status, requestedAsUser, originalUser) {

        // IF it's an auth error or if they were redirected to login and got a 200, or there's just no other error.
        // AND their login status has changed since loading the page.
        if ((status === 401 || isSuccessHttpCodeRange(status)) && !usersEqual(requestedAsUser, originalUser)) {

            // four possible next steps:
            // 1. Just have them reload the page for consistent state
            // 2. Have them log in if they're not logged in.
            // 3. Send them Back to Projects if they don't have permission.
            // 4. Do nothing - IE sucks so we have to just assume everything went OK.
            var errorBuilder;
            if (status === 401) {
                errorBuilder = new ErrorBuilder().doAccessDenied(requestedAsUser != null);
            } else if (requestedAsUser || !shouldIgnoreLoggedOutUser(jqXhr, status)) {
                errorBuilder = new ErrorBuilder()[requestedAsUser ? "shouldReload" : "shouldLogin"]();
            } else {
                // ignoring logged out user.
                return null;
            }

            // five possible reasons/messages
            // 1. Logged in, but permission was restricted concurrently so anonymous user could see, but now logged in user can't see (rare)
            // 2. Logged in - just refresh for consistent state
            // 3. Logged out - whichever action we're taking, just use the "you've been logged out" message.
            // 4. Switched users, and new user lacks permission
            // 5. Switched users, and new user also has permission.
            if (!originalUser) { // they weren't logged in, but now they are.
                if (status === 401) { // and in doing so actually LOST permission. (perhaps a timing coincidence)
                    return errorBuilder
                        .message(stash_i18n(
                            "stash.web.error.logged.in.and.denied",
                            "You''ve logged in as {0}, but that user doesn''t have permission to see this content.",
                            '"' + requestedAsUser.name + '"'))
                        .build();
                } else {
                    return errorBuilder
                        .title(stash_i18n('stash.web.error.logged.in.title', "You''ve logged in"))
                        .message(stash_i18n(
                            'stash.web.error.logged.in',
                            "You''ve logged in as {0}. Please refresh the page to avoid seeing inconsistent information.",
                            '"' + requestedAsUser.name + '"'))
                        .build();
                }
            } else if (!requestedAsUser) { // they got logged out
                // message works whether they need to login or just reload the page.
                return errorBuilder
                    .title(stash_i18n('stash.web.error.logged.out.title', "You''re not logged in"))
                    .message(stash_i18n('stash.web.error.logged.out', 'You are no longer logged in. Your session may have timed out.'))
                    .build();
            } else { // switched users
                if (status === 401) {
                    return errorBuilder
                        .message(stash_i18n(
                            "stash.web.error.logged.in.as.other.and.denied",
                            "You are no longer logged in as {0}, and your current user {1} doesn''t have access to view this.",
                            '"' + originalUser.name + '"',
                            '"' + requestedAsUser.name + '"'))
                        .build();
                } else {
                    return errorBuilder
                        .title(stash_i18n('stash.web.error.user.changed.title', "You''ve switched users"))
                        .message(stash_i18n(
                             "stash.web.error.logged.in.as.other",
                             "You logged out as {0} and logged in as {1}. Please refresh the page to avoid seeing inconsistent information.",
                             '"' + originalUser.name + '"',
                             '"' + requestedAsUser.name + '"'))
                        .build();
                }
            }
        }

        return null;
    }

    function getRequestedAsUser(jqXhr) {
        var userId = jqXhr.getResponseHeader('X-AUSERID');
        var userName = jqXhr.getResponseHeader('X-AUSERNAME');
        return userName != null ? {
            id : userId != null ? parseInt(userId, 10) : null,
            name: decodeURIComponent(userName)
        } : null;
    }

    function usersEqual(user1, user2) {
        if (user1 == null || user2 == null) {
            return (user1 || null) === (user2 || null);
        } else if (user1.id != null && user2.id != null) {
            return user1.id === user2.id;
        } else {
            return user1.name === user2.name;
        }
    }

    exports.getDominantAJAXError = function(jqXhr, internalRequestedAsUser, internalOriginalUser) {
        var status = Number(jqXhr.status);

        var originalUser = internalOriginalUser !== undefined ?
                           internalOriginalUser :
                           pageState.getCurrentUser() ? pageState.getCurrentUser().toJSON() : null;
        var requestedAsUser = internalRequestedAsUser !== undefined ?
                              internalRequestedAsUser :
                              getRequestedAsUser(jqXhr);

        // because AJAX requests are redirected to login, even a 200 could potentially be a session timeout.
        var userChangedError = handlePermissionErrorsFromUserChanging(jqXhr, status, requestedAsUser, originalUser);
        if (userChangedError) {
            return userChangedError;
        }

        if (status === 0 || status >= 400 && status < 600) {

            switch(status) {
                case 401:
                    return new ErrorBuilder().doAccessDenied(!!originalUser).build();
                case 404:
                    return new ErrorBuilder().doNotFound().build();
                case 0:
                    // The server MAY be down, but first check these common alternative explanations

                    // pageIsLoaded: if the page is being unloaded, browsers will abort AJAX requests.
                    // jqXhr.statusText !== 'abort': the request wasn't manually aborted
                    // Date.now() - latestEscKeyTime > 100: in Firefox, pressing Esc will cancel AJAX requests but jQuery reports it as an error.
                    if (pageIsLoaded && jqXhr.statusText !== 'abort' && ((new Date().getTime()) - latestEscKeyTime > 100)) {
                        return new ErrorBuilder().doServerDown().build();
                    }
                    break;
                case 502:
                    return new ErrorBuilder().doServerDown().build();
                case 503:
                    return new ErrorBuilder().doRequestThrottled(jqXhr.getResponseHeader("Retry-After")).build();
                default:
                    // else we screwed up
                    return new ErrorBuilder(
                        null,
                        stash_i18n('stash.web.we.screwed.up', 'Something went wrong while trying to serve your request. Try reloading the page.'))
                    .shouldReload()
                    .build();
            }
        }

        return null;
    };

    exports.getDominantRESTError = function(data, jqXhr) {

        var status, requestedAsUser, originalUser;

        originalUser = pageState.getCurrentUser() ? pageState.getCurrentUser().toJSON() : null;

        // handle user-switching errors first
        if (jqXhr) {
            status = Number(jqXhr.status);

            requestedAsUser = getRequestedAsUser(jqXhr);

            var userChangedError = handlePermissionErrorsFromUserChanging(jqXhr, status, requestedAsUser, originalUser);
            if (userChangedError) {
                return userChangedError;
            }
        }

        // Then handle errors from data that may have more specific messages than what we can offer client-side.
        if (data && data.errors && data.errors.length) {
            var rawError = data.errors[0],
                builder = new ErrorBuilder(
                    rawError.title || titleForStatusCode[status],
                    rawError.message,
                    rawError.details,
                    rawError.context,
                    rawError.level || exports.level.ERROR
                );

            switch(status) {
                case 401:
                    builder.doAccessDenied(originalUser != null);
                    break;
                case 404:
                    builder.doNotFound();
                    break;
                case 409:
                    builder.shouldReload();
                    break;
                case 503:
                    builder.doRequestThrottled(jqXhr.getResponseHeader("Retry-After"));
                    break;
            }

            return builder.build();
        }

        // Finally fallback to generic HTTP error handling, if necessary
        if (jqXhr) {
            return exports.getDominantAJAXError(jqXhr, requestedAsUser, originalUser);
        }

        return null;
    };

    /**
     * Clear any existing errors in the form and add the given errors.
     *
     * @param {HTMLElement|jQuery|String} form the form to set the errors into
     * @param {Array} errors an array of errors
     */
    exports.setFormErrors = function(form, errors) {
        var $form = $(form);
        exports.clearFormErrors($form);
        var formErrors = _.chain(errors)
            .filter(function(error) {
                if (!error.message) {
                    return false;
                }
                // This is a little impure but it is very convenient.
                // While we are finding errors to apply at a form level,
                // filter out field errors and append them to the fields
                // as we go!
                if (error.context) {
                    var $field = $form.find('[name="' + error.context + '"]').closest('.field-group');
                    if ($field.length) {
                        $(document.createElement('div'))
                            .addClass('error')
                            .text(error.message)
                            .appendTo($field);
                        return false;
                    }
                }
                return true;
            })
            .pluck('message')
            // Escape at this point so that we can use br tags to concatenate
            .map(AJS.escapeHtml)
            .value()
            .join('<br>');

        if (formErrors) {
            $form.prepend(aui.message.error({
                content: formErrors
            }));
        }
    };

    /**
     * Clear all the errors in a given form.
     *
     * @param {HTMLElement|jQuery|String} form the form to clear the errors from.
     */
    exports.clearFormErrors = function(form) {
        $(form).find('.error').remove();
    };

});


