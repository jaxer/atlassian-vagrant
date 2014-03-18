define('page/changeset/changeset',[
    'jquery',
    'underscore',
    'memoir',
    'util/events',
    'layout/page-scrolling-manager',
    'util/navbuilder',
    'model/page-state',
    'model/revision',
    'model/commit-range',
    'model/participant',
    'model/participant-collection',
    'model/stash-user',
    'widget/unwatch-notification',
    'feature/changeset/tree-and-diff-view',
    'feature/comments',
    'feature/discussion/participants-list',
    'feature/watch',
    'exports'
], function (
    $,
    _,
    memoir,
    events,
    pageScrollingManager,
    navbuilder,
    pageState,
    Revision,
    CommitRange,
    Participant,
    Participants,
    StashUser,
    unwatchNotification,
    treeAndDiffView,
    comments,
    ParticipantsList,
    Watch,
    exports
) {
    var ROOT = "ROOT";

    // state data
    var atRevision,
        parentRevisions,
        parentRevisionsById,
        currentParentRevision;

    //DOM elements
    var $diffToTrigger,
        $diffToParentOptions;

    function updateParentSelector(selectedParentRevision) {
        $diffToParentOptions.each(function() {
            var $this = $(this);
            var $thisLink = $this.find('a');
            var isSelected = $thisLink.attr('data-id') === selectedParentRevision.getId();

            $this.toggleClass('selected', isSelected);

            if (isSelected) {
                $diffToTrigger.text($this.find('.changesetid').text());
            }
        });
    }

    function initForParentId(parentId) {
        currentParentRevision = Object.prototype.hasOwnProperty.call(parentRevisionsById, parentId) ? parentRevisionsById[parentId] : parentRevisions[0];

        updateParentSelector(currentParentRevision);
    }

    function pushState(newParentId) {
        var newUrl = navbuilder
                    .currentRepo()
                    .changeset(atRevision.getId())
                    .withParams({ to : newParentId })
                    .build();

        memoir.pushState(null, null, newUrl);
    }

    function getParentIdFromUrl(parents) {
        return navbuilder.parse(window.location.href).getQueryParamValue('to') ||
               (parents.length && parents[0].getId()) ||
               ROOT;
    }

    function onStateChange() {
        var parentId = getParentIdFromUrl(parentRevisions);

        var parentIdChanged = parentId && parentId !== currentParentRevision.getId();

        if (parentIdChanged) {
            events.stop();
            // don't propagate the event down to treeAndDiffView, otherwise it will first (incorrectly) make a request for the diff of the current file at the new parent,
            // which is discarded as it is immediately followed by the correct request (diff for first file in the tree at the new revision)
            initForParentId(parentId);
            treeAndDiffView.updateCommitRange(new CommitRange({
                untilRevision : atRevision,
                sinceRevision : currentParentRevision
            }));
        }

    }

    function listenForKeyboardShortcutRequests() {
        events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
            keyboardShortcuts.enableContext('changeset');
            keyboardShortcuts.enableContext('diff-tree');
            keyboardShortcuts.enableContext('diff-view');
        });

        events.on('stash.keyboard.shortcuts.requestReturnToCommits', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                window.location.href = $('#repository-nav-commits').attr('href'); //Make sure we include the sticky branch if there is one
            });
        });
    }

    function initWatching() {
        var changeset = pageState.getChangeset();
        var changesetWatchRestUrl = navbuilder.rest().currentRepo().commit(changeset.getId()).watch().build();
        var $watch = $('.watch a');
        var watch = new Watch($watch, changesetWatchRestUrl, Watch.type.COMMIT);

        pageState.getCommitParticipants().on('add', function (participant) {
            var currentUser = pageState.getCurrentUser();
            if (currentUser && currentUser.getName() === participant.getUser().getName()) {
                watch.setIsWatching(true);
            }
        });
    }

    function initParticipantsList(participants) {
        events.on('stash.feature.comments.commentAdded', function(comment) {
            var commentUser = new StashUser(comment.author);
            if (commentUser.getEmailAddress() !== pageState.getChangeset().getAuthor().emailAddress &&
                !participants.findByUser(commentUser)) {
                participants.add(new Participant({
                    user: commentUser
                }));
            }
        });

        new ParticipantsList(participants, $('.participants-dropdown ul'), $('.participants.plugin-item'));
    }

    exports.onReady = function(jsonRevision, jsonParentRevisions, maxChanges, relevantContextLines, extrasSelector,
                               project, changeset, participantsJSON, unwatched) {
        var participants = new Participants(_.reject(participantsJSON,
            function(participant) {
                // Filter out the changeset author as a participant by email
                return participant.user.emailAddress === changeset.author.emailAddress;
            }
        ));
        pageState.extend('isWatching');
        pageState.extend('commitParticipants');
        pageState.setCommitParticipants(participants);

        var isWatchingPromise = $.Deferred();
        _PageDataPlugin.ready('com.atlassian.stash.stash-web-plugin:iswatching-provider', 'stash.page.changeset', function(data) {
            pageState.setIsWatching(data.isWatching);
            isWatchingPromise.resolve(data.isWatching);
        });

        atRevision = new Revision(jsonRevision);
        pageState.setRevisionRef(atRevision.getRevisionReference());
        pageState.setChangeset(atRevision);
        parentRevisions = _.map(jsonParentRevisions, function(revisionJson) {
            return new Revision(revisionJson);
        });

        parentRevisionsById = {};

        if (parentRevisions.length) {
            for (var i = 0, l = parentRevisions.length, parent; i < l; i++) {
                parent = parentRevisions[i];
                parentRevisionsById[parent.getId()] = parent;
            }
        } else {
            parentRevisionsById[ROOT] = new Revision({ id : ROOT });
        }

        var $diffToToolbar = $('.changeset-metadata-diff-to');

        $diffToParentOptions = $diffToToolbar.find('.aui-dropdown2 .changeset-list-item');

        $diffToTrigger = $diffToToolbar.find('.aui-dropdown2-trigger');

        if (memoir.nativeSupport()) {
            $diffToParentOptions.click(function(e) {
                e.preventDefault();

                var $newParent = $(this);
                var newParentId = $newParent.find('a').attr('data-id');
                $diffToParentOptions.removeClass('selected').addClass('unselected');

                $newParent.addClass('selected').removeClass('unselected');
                if (newParentId !== currentParentRevision.getId()) {
                    pushState(newParentId);
                }

            });
        }

        // memoir fires a changestate event when the hash changes for browsers that support pushState...
        events.on('memoir.changestate', onStateChange);

        pageScrollingManager.acceptScrollForwardingRequests();

        // ...but for browsers that don't support pushState, we have to manually listen for it.
        if (!memoir.nativeSupport()) {
            $(window).hashchange(onStateChange);
        }

        initForParentId(getParentIdFromUrl(parentRevisions));

        treeAndDiffView.init(new CommitRange({
            untilRevision: atRevision,
            sinceRevision : currentParentRevision
        }), {
            maxChanges : maxChanges,
            relevantContextLines: relevantContextLines,
            numberOfParents : parentRevisions.length,
            toolbarWebFragmentLocationPrimary : 'stash.changeset.diff.toolbar.primary',
            toolbarWebFragmentLocationSecondary : 'stash.changeset.diff.toolbar.secondary',
            commentMode : pageState.getCurrentUser() ? comments.commentMode.CREATE_NEW : comments.commentMode.NONE
        });

        listenForKeyboardShortcutRequests();

        $(extrasSelector + ' .plugin-section-primary').append(stash.page.changesetRelatedEntityWebPanels({
            project: project,
            changeset: changeset
        }));
        $(extrasSelector + ' .plugin-section-secondary').append(stash.page.changesetExtrasWebSectionsAndPanels({
            project: project,
            changeset: changeset
        }));

        if (pageState.getCurrentUser()) {
            initParticipantsList(participants);
            isWatchingPromise.done(initWatching); // has to be done after the primary plugin section has been rendered
        }

        if (unwatched) {
            var unwatchOptions = {
                dialogTitle: stash_i18n('stash.web.commit.unwatched.header',
                    'Stopped watching commit {0}',
                    pageState.getChangeset().getDisplayId()),
                dialogText: stash_i18n('stash.web.commit.unwatched.content',
                    'Notifications for this commit will no longer be sent to you.')
            };

            $(window).load(unwatchNotification.bind(null, unwatchOptions));
        }
    };
});
