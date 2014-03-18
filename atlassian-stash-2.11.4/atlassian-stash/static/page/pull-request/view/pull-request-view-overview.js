define('page/pull-request/view/pull-request-view-overview', [
    'jquery',
    'util/navbuilder',
    'util/events',
    'util/deprecation',
    'model/page-state',
    'lib/jsuri',
    'feature/comments/comment-tips',
    'feature/pull-request/pull-request-activity',
    'feature/discussion/participants-list',
    'feature/watch'
], function (
    $,
    nav,
    events,
    deprecate,
    pageState,
    Uri,
    commentTips,
    PullRequestActivity,
    ParticipantsList,
    Watch
) {
    var currentEl;
    var activity;
    var watchButton;
    var participantsList;
    var mergeIsConflicted = false;
    var participants;

    function showConflictedMergeBanner(el) {
        var mergeConflictBanner = $(stash.feature.pullRequest.mergeConflictBanner({
            extraClasses: 'transparent'
        }))
        .prependTo(el)
        .find('.manual-merge')
        .click(function(e) {
            e.preventDefault();
            events.trigger('stash.pull-request.show.cant.merge.help');
        })
        .end();

        setTimeout(function(){ mergeConflictBanner.removeClass('transparent'); }, 0); //Let the message get rendered before starting the fade in.
    }

    function onParticipantAddedToggleWatch(participant) {
        var currentUser = pageState.getCurrentUser();
        if (currentUser && currentUser.getName() === participant.getUser().getName()) {
            watchButton.setIsWatching(true);
        }
    }

    //noinspection JSUnusedLocalSymbols
    events.on('stash.pull-request.cant.merge', function(pullRequest, conflicted, vetoes) {
        // Show the banner if we haven't already shown it and there are conflicts - not if merge check vetoes are the only thing stopping a merge
        if (!mergeIsConflicted && conflicted && currentEl) {
            // This event will only fire once during a load of the pull request.
            // Save the result in mergeIsConflicted so we can re-display the conflicted banner
            // when the user clicks back to the overview tab from other tabs.
            mergeIsConflicted = true;
            showConflictedMergeBanner(currentEl);
        }
    });

    return {
        load : function(el) {
            currentEl = el;

            var pullRequest = pageState.getPullRequest();

            el.innerHTML = stash.page.pullRequest.viewOverview({
                pullRequest : deprecate.jsonAsBrace(pullRequest, '2.5.1', '3.0'),
                author: pullRequest.getAuthor().getUser().toJSON(),
                createdDate: pullRequest.getCreatedDate(),
                description: pullRequest.getDescription(),
                descriptionAsHtml: pullRequest.getDescriptionAsHtml(),
                currentUser: pageState.getCurrentUser() && pageState.getCurrentUser().toJSON(),
                commentTips: commentTips.tips
            });

            // Ensures the general comment at the top of the page is wrapped into a expanding area.
            // Note that the other general comments and the diff comments are not in the page at this stage;
            // they will be fetched asynchronously below (through a request triggered in activity.init() below).
            $(el).find('textarea.expanding').expandingTextarea();

            if (mergeIsConflicted) {
                showConflictedMergeBanner(el);
            }

            var $watch = $('.watch a');
            var watchPullRequestRestUrl = nav.rest().currentPullRequest().watch().build();
            watchButton = new Watch($watch, watchPullRequestRestUrl, Watch.type.PULL_REQUEST);
            participants = pullRequest.getParticipants();
            participants.on('add', onParticipantAddedToggleWatch);
            participantsList = new ParticipantsList(participants, $('#participants-dropdown ul'), $('.participants.plugin-item'));

            var uri = new Uri(window.location);
            var fromType = uri.getQueryParamValue('commentId') ? 'comment' : 'activity';
            var fromId = uri.getQueryParamValue('commentId') || uri.getQueryParamValue('activityId');

            activity = new PullRequestActivity($(el).find('.pull-request-activity'), pullRequest, fromType, fromId, {
                scrollableElement:window
            });

            activity.init();
        },
        // This is _only_ exposed for the live-update plugin and should _not_ be used for anything else
        _internalActivity: function() {
            return activity;
        },
        unload : function(el) {
            activity.reset();
            activity = null;
            $(el).empty();
            currentEl = null;
            participants.off('add', onParticipantAddedToggleWatch);
            watchButton.destroy();
            watchButton = null;
            participantsList.destroy();
            participantsList = null;
        },
        keyboardShortcutContexts : ['pull-request-overview']
    };
});
