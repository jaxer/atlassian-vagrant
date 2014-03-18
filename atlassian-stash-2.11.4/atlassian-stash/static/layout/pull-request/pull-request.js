define('layout/pull-request', [
    'jquery',
    'util/events',
    'underscore',
    'memoir',
    'aui',
    'util/ajax',
    'util/navbuilder',
    'util/feature-loader',
    'util/dom-event',
    'model/page-state',
    'model/pull-request',
    'model/participant',
    'widget/approve',
    'widget/avatar-list',
    'widget/confirm-dialog',
    'widget/submit-spinner',
    'feature/pull-request-edit',
    'feature/pull-request/can-merge',
    'feature/pull-request/merge-help',
    'exports'
], function(
    $,
    events,
    _,
    memoir,
    AJS,
    ajax,
    nav,
    FeatureLoader,
    domEventUtil,
    pageState,
    PullRequest,
    Participant,
    Approve,
    AvatarList,
    ConfirmDialog,
    SubmitSpinner,
    PullRequestEdit,
    canMerge,
    mergeHelp,
    exports) {

    var pullRequest,
        $actionToolbar,
        $actionToolbarSpinner,
        $tabMenu;

    var haveKeyboardShortcutsObject = $.Deferred();

    function getActionUrl(action, withVersion) {
        var builder = nav.rest().currentPullRequest()[action]();

        if (withVersion) {
            builder = builder.withParams({ version: pageState.getPullRequest().getVersion() });
        }
        return builder.build();
    }

    function initActionButton($button, action) {
        $button.click({action: action}, buttonAction);
    }

    function initMergeButton($mergeButton) {
        if ($mergeButton.length) {
            var options = {
                dialog: {
                    person: pageState.getCurrentUser() && pageState.getCurrentUser().toJSON(),
                    pullRequest: pullRequest.toJSON()
                },
                ajax : {
                    statusCode : {
                        '400' : function() {return false;},
                        '401' :  function(xhr, textStatus, errorThrown, errors, dominantError) {

                            return $.extend({}, dominantError, {
                                title: stash_i18n("stash.web.pull-request.merge.error.401.title", "Could not merge pull request"),
                                message: stash_i18n("stash.web.pull-request.merge.error.401.message", "You no longer have permission to merge this pull request."),
                                fallbackUrl: false,
                                shouldReload: true
                            });
                        },
                        '409' :  function(xhr, textStatus, errorThrown, errors, dominantError) {

                            var error = errors.errors && errors.errors.length && errors.errors[0];
                            if (error && (error.conflicted || (error.vetoes && error.vetoes.length))) {
                                events.trigger('stash.pull-request.cant.merge', null, pullRequest, error.conflicted, error.vetoes);
                                events.trigger('stash.pull-request.show.cant.merge.help');
                                return false;
                            }
                        }
                    }
                }
            };


            createMergeDialog($mergeButton, options);
            checkCanMerge($mergeButton);
        }
    }

    function initDeclineButton($declineButton) {
        if ($declineButton.length) {
            var panelContent = "<p class='decline-message'>" +
                stash_i18n("stash.web.pull-request.decline.dialog.message",
                    "Are you sure you want to decline this pull request? This will close the pull request without merging.") + "</p>";

            var options = {
                buttonSelector : '.decline-pull-request',
                confirmDialog : {
                    titleText: stash_i18n('stash.web.pull-request.decline.dialog.title', 'Decline Pull Request'),
                    panelContent: panelContent,
                    submitText : stash_i18n('stash.web.button.decline', 'Decline')
                },
                ajax : {
                    statusCode : {
                        '401' :  function(xhr, textStatus, errorThrown, errors, dominantError) {
                            return $.extend({}, dominantError, {
                                title: stash_i18n("stash.web.pull-request.decline.error.401.title", "Could not decline pull request"),
                                message: stash_i18n("stash.web.pull-request.decline.error.401.message", "You no longer have permission to decline this pull request."),
                                fallbackUrl: false,
                                shouldReload: true
                            });
                        }
                    }
                }
            };

            createActionDialog('decline', options);
        }
    }

    function buttonAction(e) {
        e.preventDefault();

        if ($actionToolbar.hasClass('disabled')) {
            return;
        }
        $actionToolbar.addClass('disabled');
        $actionToolbarSpinner.show().spin('small');

        ajax.rest({
            url: getActionUrl(e.data.action, true),
            type: 'POST'
        }).done(function() {
            window.location.reload();
        }).fail(function() {
            $actionToolbar.removeClass('disabled');
            $actionToolbarSpinner.spinStop().hide();
        });
    }

    function createActionDialog(action, options) {
        var actionDialog = new ConfirmDialog($.extend({
            id : "pull-request-" + action + "-dialog",
            submitToHref : false,
            resizeOnShow : true,
            width : 650,
            height : 200
        }, options.confirmDialog));

        var actionXhr;
        var promiseDecorator;

        actionDialog.addConfirmListener(function(promise, $trigger, removeDialog, dialog, $spinner) {
            actionDialog.setButtonsDisabled(true);
            $spinner.show();

            actionXhr = ajax.rest($.extend({
                url: getActionUrl(action, true),
                type: 'POST'
            }, options.ajax));

            var actionPromise = actionXhr;

            if (promiseDecorator) {
                var decoratedPromise = promiseDecorator(actionXhr, $trigger, removeDialog, dialog, $spinner);
                if (decoratedPromise) {
                    actionPromise = decoratedPromise;
                }
            }

            actionPromise.done(function() {
                window.location = nav.currentPullRequest().build();
            }).fail(function() {
                removeDialog();
            }).always(function() {
                actionXhr = null;
            });
        });

        actionDialog.addCancelListener(function(dialog) {
            if (actionXhr) {
                actionXhr.abort();
            }
        });

        // An extension point for branch delete on merge - allows it to hook in after
        actionDialog.setPromiseDecorator = function(decorator) {
            promiseDecorator = decorator;
        };

        actionDialog.attachTo(options.buttonSelector, options.onShow);

        return actionDialog;
    }

    // Creates a AUI Dialog2 dialog, separate from the legacy actionDialog which uses ConfirmDialog (AUI Dialog 1)
    function createMergeDialog($mergeButton, options) {
        var mergeDialog = AJS.dialog2(stash.feature.pullRequest.merge.dialog(options.dialog));

        // we manually add the dialog to the body so that it's on the DOM and available for the branch deletion plugin
        // to disable the checkbox
        $('body').append(mergeDialog.$el);

        $mergeButton.on('click', function() {
            mergeDialog.show();
            mergeDialog.$el.find('.confirm-button').focus();
        });

        var mergeXhr;
        var promiseDecorator;

        mergeDialog.$el.find('.confirm-button').on('click', function() {

            var spinner = new SubmitSpinner(this, 'before');

            setMergeDialogButtonsDisabled(mergeDialog, true);
            spinner.show();

            mergeXhr = ajax.rest($.extend({
                url: getActionUrl('merge', true),
                type: 'POST'
            }, options.ajax));

            var mergePromise = mergeXhr;

            mergeXhr.fail(function(xhr, textStatus, errorThrown, resp) {
                if (xhr.status === 400) {
                    var $mergeDialogContent = mergeDialog.$el.find('.aui-dialog2-content');

                    if (resp.errors) {
                        $mergeDialogContent.children('.aui-message').remove();
                        $mergeDialogContent.prepend(stash.feature.pullRequest.merge.errors({'errors': resp.errors }));
                    }
                    spinner.hide();
                    setMergeDialogButtonsDisabled(mergeDialog, false);
                } else {
                    mergeDialog.hide();
                }
            }).always(function() {
                mergeXhr = null; // null it out so that merge can't be cancelled below
            });



            // HACK - we don't want to expose plugin points for the promise yet
            // we hard code a link to the branch deletion, if it's available
            if (!promiseDecorator) {
                try {
                    promiseDecorator = require('pullRequest/branchDeletion').getMergePromiseDecorator;
                } catch(e) {
                    // ignore
                }
            }

            if (promiseDecorator) {
                var decoratedPromise = promiseDecorator(mergePromise, function() { mergeDialog.hide(); });
                if (decoratedPromise) {
                    mergePromise = decoratedPromise;
                }
            }

            mergePromise.done(function() {
                window.location = nav.currentPullRequest().build();
            });
        });

        mergeDialog.$el.find('.cancel-button').on('click', function() {
            if (mergeXhr) {
                mergeXhr.abort();
                mergeXhr = null;
            }
            mergeDialog.hide();
        });

        return mergeDialog;
    }

    function bindKeyboardShortcuts() {

        events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
            keyboardShortcuts.enableContext('pull-request');
            haveKeyboardShortcutsObject.resolve(keyboardShortcuts);
        });

        events.on('stash.keyboard.shortcuts.requestGotoPullRequestsListHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                window.location.href = nav.currentRepo().allPullRequests().build();
            });
        });

        events.on('stash.keyboard.shortcuts.requestChangePullRequestSectionHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function(e) {
                var number = parseInt(String.fromCharCode(e.which), 10);
                var $link = $tabMenu.children().eq(number - 1).children('a');
                if (memoir.nativeSupport()) {
                    // trigger the pushstate events
                    $link.click();
                } else {
                    window.location.href = $link.prop('href');
                }
            });
        });
    }

    // Replicate the ConfirmDialog setButtonsDisabled method
    function setMergeDialogButtonsDisabled(dialog, disabled) {
        var $buttons = dialog.$el.find('.aui-dialog2-footer-actions .aui-button');

        $buttons.each(function () {
            var $button = $(this);
            $button.prop("disabled", disabled).toggleClass("disabled", disabled);
            if (disabled) {
                $button.attr("aria-disabled", "true");
            } else {
                $button.removeAttr("aria-disabled");
            }
        });
    }

    function checkCanMerge($mergeButton) {
        var $conflictWarning;
        events.on('stash.pull-request.cant.merge', function(pullRequest, conflicted, vetoes) {
            if (!$conflictWarning) {
                $mergeButton.attr('aria-disabled', 'true')
                            .attr('disabled', 'disabled')
                            .attr('title', stash_i18n('stash.web.pull-request.merge.issue.tooltip', 'This pull request can\'\'t be merged automatically.'));

                $conflictWarning = $(stash.feature.pullRequest.mergeDisabledIcon({
                    conflicted: conflicted,
                    vetoes: vetoes
                }))
                    .insertBefore($mergeButton)
                    .tooltip({
                        delayOut: 200,
                        gravity: 'n',
                        html: true,
                        hoverable: true,
                        offset: 7
                    }).on('click', function(e) {
                        e.preventDefault();
                        $('.tipsy').hide();
                        events.trigger('stash.pull-request.show.cant.merge.help');
                    });
            }
        });

        events.on('stash.pull-request.can.merge', function() {
            if ($conflictWarning) {
                $mergeButton.attr('aria-disabled', 'false')
                            .removeAttr('disabled')
                            .removeAttr('title');

                $conflictWarning.remove();
                $conflictWarning = null;
            }
        });

        canMerge(pullRequest);
    }

    function initTabs() {
        function setTabActive($tab) {
            $tab.addClass('active-tab')
                .siblings().removeClass('active-tab');
        }

        haveKeyboardShortcutsObject.done(function(keyboardShortcuts) {
            _.each($tabMenu.children(), function (tab, index) {
                var $tab = $(tab);
                var key = String(index + 1);
                var message = stash_i18n('stash.keyboard-shortcuts.pull-request.switch.tabs', 'Switch to the {0} tab', $tab.text());
                keyboardShortcuts.addCustomShortcut('pull-request', [ [ key ] ], message);
                $tab.attr('title', ($tab.attr('title') || message) + stash_i18n('stash.keyboard-shortcuts.type.x', " (Type ''{0}'')", key));
            });
        });

        if (memoir.nativeSupport()) {
            $tabMenu.on('click', 'a', function(e) {
                if (!domEventUtil.openInSameTab(e)) {
                    return;
                }
                var $a = $(this),
                    $tab = $a.parent();

                if (!$tab.is('.active-tab')) {
                    setTabActive($tab);
                    events.trigger('stash.layout.pull-request.urlRequested', null, $a.prop('href'));
                }

                e.preventDefault();
            });
            events.on('stash.page.pull-request.view.contextLoaded', function(context) {
                setTabActive($tabMenu.find('[data-module-key="' + context.name + '"]'));
            });
        }
    }

    function initReviewersLists($reviewersList) {
        return new AvatarList($reviewersList, pullRequest.getReviewers(), {
            pullRequestId: pullRequest.getId()
        });
    }

    function initUpdateApproval() {

        function updateApproval(approvalJSON) {
            var reviewer = pullRequest.getReviewers().findByUser(approvalJSON.user);

            if (reviewer) {
                reviewer.setApproved(approvalJSON.approved);
                pullRequest.getReviewers().sort();  // Changing attributes does not trigger an automatic sort
            } else {
                var participant = pullRequest.getParticipants().findByUser(approvalJSON.user);

                if (participant) {
                    participant.setApproved(approvalJSON.approved);
                    pullRequest.getParticipants().sort();
                }
            }
        }

        events.on('stash.widget.approve-button.adding', updateApproval);
        events.on('stash.widget.approve-button.removing', updateApproval);
        events.on('stash.widget.approve-button.add.failed', updateApproval);
        events.on('stash.widget.approve-button.remove.failed', updateApproval);
    }

    function initParticipants() {

        function addParticipant(participantJSON) {
            var newParticipant = new Participant(participantJSON);
            var reviewer = pullRequest.getReviewers().findByUser(newParticipant.getUser());

            if (!reviewer) {
                var participant = pullRequest.getParticipants().findByUser(newParticipant.getUser());

                if (!participant) {
                    pullRequest.addParticipant(newParticipant);

                    return true;
                }
            }

            return false;
        }

        events.on('stash.widget.approve-button.adding', function(approvalJSON) {
            addParticipant({
                approved: approvalJSON.approved,
                user: approvalJSON.user,
                role: 'PARTICIPANT'
            });
        });

        events.on('stash.feature.comments.commentAdded', function(comment) {
            if (comment.author.name !== pullRequest.getAuthor().getUser().getName()) {
                addParticipant({
                    approved: false,  // if the user has already approved, this won't remove it.
                    user: comment.author,
                    role: 'PARTICIPANT'
                });
            }
        });

        pullRequest.getParticipants().on('add', function(participant) {
            var currentUser = pageState.getCurrentUser();
            if (currentUser && currentUser.getName() === participant.getUser().getName()) {
                pageState.setIsWatching(true);
            }
        });
    }

    var loader = new FeatureLoader({
        loadedEvent : 'stash.page.pull-request.view.contextLoaded',
        unloadedEvent : 'stash.page.pull-request.view.contextUnloaded',
        requestedEvent : 'stash.page.pull-request.view.contextRequested'
    });

    function initLoader(contentSelector, dataReady) {
        // TODO: Consider Jason's idea of contexts. Lots of weirdness to flesh out with
        // TODO: the best API for this stuff.

        loader.registerHandler(
            'stash.pull-request.nav.diff',
            /^[^\?\#]*pull-requests\/\d+\/diff/,
            'page/pull-request/view/pull-request-view-diff');
        loader.registerHandler(
            'stash.pull-request.nav.overview',
            /^[^\?\#]*pull-requests\/\d+\/overview/,
            'page/pull-request/view/pull-request-view-overview');
        loader.registerHandler(
            'stash.pull-request.nav.commits',
            /^[^\?\#]*pull-requests\/\d+\/commits/,
            'page/pull-request/view/pull-request-view-commits');

        events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
            loader.setKeyboardShortcuts(keyboardShortcuts);
            keyboardShortcuts.enableContext('pull-request');
        });

        events.on('stash.layout.pull-request.urlRequested', function(url) {
            if (url !== window.location.href) {
                memoir.pushState(null, '', url);
            }
        });

        events.on('stash.util.feature-loader.errorOccurred', function(error) {
            if (error.code === FeatureLoader.NO_HANDLER) {
                console.log("You did not register a handler for this page. Please call\n" +
                "require('layout/pull-request').registerHandler(\n" +
                "   'tab-web-item-module-key',\n" +
                "   /^[^\\?\\#]*url-regex/,\n" +
                "   {\n" +
                "       load : function (contentElement) {},\n" +
                "       unload : function (contentElement) {}\n" +
                "   }\n" +
                ")");
            } else {
                console.log(error.message);
            }
        });

        dataReady.done(function(data) {
            loader.init($(contentSelector).get(0));
        });
    }

    exports.registerHandler = $.proxy(loader.registerHandler, loader);

    exports.onReady = function(
        pullRequestJSON,
        startingSection,
        contentSelector,
        diffTreeHeaderWebItems,
        commitsTableWebSections,
        maxChanges,
        relevantContextLines
    ) {
        pageState.setPullRequest(new PullRequest(pullRequestJSON));
        pageState.extend("pullRequestViewInternal", function() {
            return {
                diffTreeHeaderWebItems : diffTreeHeaderWebItems,
                commitsTableWebSections : commitsTableWebSections,
                maxChanges : maxChanges,
                relevantContextLines : relevantContextLines
            };
        });
        pageState.extend('isWatching');
        var isWatchingPromise = $.Deferred();
        _PageDataPlugin.ready('com.atlassian.stash.stash-web-plugin:iswatching-provider', 'stash.internal.pull-request.view', function(data) {
            pageState.setIsWatching(data.isWatching);
            isWatchingPromise.resolve();
        });

        mergeHelp.init();

        pullRequest = pageState.getPullRequest();

        var $mergeButton = $('.merge-pull-request'),
            $declineButton = $('.decline-pull-request'),
            $reopenButton = $('.reopen-pull-request'),
            $approveButton = $('.approve'),
            pullRequestEdit = new PullRequestEdit(pullRequest);

        // Won't know which buttons exist on the page so add all of them
        $actionToolbar = $('.pull-request-toolbar .aui-toolbar2-secondary');
        $actionToolbarSpinner = $("<div class='spinner'/>").prependTo($actionToolbar.children(':first-child'));

        $tabMenu = $('.content-body .aui-page-panel-content > .aui-tabs > .tabs-menu');

        initMergeButton($mergeButton);
        initDeclineButton($declineButton);
        initActionButton($reopenButton, 'reopen');
        pullRequestEdit.bind('.edit-pull-request, .add-description'); //.add-description is from pull-request-overview

        new Approve($approveButton, getActionUrl('approve'));

        initReviewersLists($('.reviewers'));
        initParticipants();
        initUpdateApproval();

        bindKeyboardShortcuts();

        initTabs();

        initLoader(contentSelector, isWatchingPromise);
    };
});

