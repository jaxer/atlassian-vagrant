define('page/source', [
    'jquery',
    'memoir',
    'util/ajax',
    'util/deprecation',
    'util/events',
    'layout/page-scrolling-manager',
    'util/navbuilder',
    'model/commit-range',
    'model/file-change',
    'model/file-content-modes',
    'model/revision-reference',
    'model/revision',
    'model/page-state',
    'model/path',
    'widget/faux-scrollbar',
    'feature/file-content',
    'feature/changeset/changeset-badge',
    'exports'
], function(
    $,
    memoir,
    ajax,
    deprecate,
    events,
    pageScrollingManager,
    navbuilder,
    CommitRange,
    FileChange,
    FileContentModes,
    RevisionReference,
    Revision,
    pageState,
    Path,
    FauxScrollbar,
    FileContent,
    changesetBadge,
    exports
) {

    var dialogIsShowing;

    exports.onReady = function(path, atRevisionRef, untilRevision, mode, fileContentContainerSelector, fileContentId, relevantContextLines) {

        pageScrollingManager.acceptScrollForwardingRequests();

        var fauxScrollbar = new FauxScrollbar();

        var currentUrl = window.location.href,
            currentPath = new Path(path),
            currentHeadRef = new RevisionReference(atRevisionRef),
            currentUntilRevision = new Revision(untilRevision),
            currentMode = FileContentModes.DIFF === mode ? FileContentModes.DIFF : FileContentModes.SOURCE;

        var fileContent = new FileContent(fileContentContainerSelector, fileContentId, FileContent.sourcePreset);

        events.on('memoir.changestate', function(e) {

            var newPath, newHeadRef, newUntilRevision, newMode;

            var state = e.state;
            if (state) {
                newPath = new Path(state.path);
                newHeadRef = new RevisionReference(state.headRef);
                newUntilRevision = state.untilRevision ? new Revision(state.untilRevision) : null;
                newMode = state.mode ? state.mode : FileContentModes.SOURCE;

                var currentUntilId = currentUntilRevision ? currentUntilRevision.getId() : null,
                    newUntilId = newUntilRevision ? newUntilRevision.getId() : null;

                var pathChanged = newPath.toString() !== currentPath.toString(),
                    headRefChanged = currentHeadRef.getId() !== newHeadRef.getId(),
                    untilRevisionChanged = newUntilId !== currentUntilId,
                    modeChanged = newMode !== currentMode,
                    stateChanged = pathChanged || headRefChanged || untilRevisionChanged || modeChanged;

                currentPath = newPath;
                currentUntilRevision = newUntilRevision;
                currentHeadRef = newHeadRef;
                currentMode = newMode;

                if (headRefChanged) {
                    events.trigger('stash.page.source.revisionRefChanged', null, currentHeadRef);
                }

                // it's possible this we're just popping a hashchange. Check that state actually changed.
                if (stateChanged) {
                    updateForState();
                }
                currentUrl = window.location.href;
            } else { // this should just be a hash change, so it should be ignorable.
                // however, browsers don't always persist state data
                // see: https://github.com/balupton/history.js/wiki/The-State-of-the-HTML5-History-API
                // "State persisted when navigated away and back"
                // in that case, we have to either regrab all the state (path from url, headRef and untilRevision from ??)
                // or reload the page. Reloading the page because it's the easier option.

                var isHashChangeOnly = endsWith(urlWithoutHash(window.location.href), urlWithoutHash(currentUrl));

                if (!isHashChangeOnly) {
                    window.location.reload();
                }
            }
        });

        function getCurrentCommitRange() {
            return new CommitRange({
                untilRevision : currentUntilRevision,
                sinceRevision : currentUntilRevision.hasParents() ?
                    currentUntilRevision.getParents()[0] :
                    undefined
            });
        }

        function urlWithoutHash(url) {
            var hashIndex = url.lastIndexOf('#');
            return hashIndex === -1 ? url : url.substring(0, hashIndex - 1);
        }
        function endsWith(str, sub) {
            return str.lastIndexOf(sub) === str.length - sub.length;
        }

        // Trigger a state change to refresh the file currently shown in the diff view.
        // Use case: diff options have changed and a new representation of the file needs to be shown.
       events.on('stash.feature.diffview.optionsChanged', updateForState);

        var pendingRequest = null;
        function updateForState() {

            // if we're still updating from a previous request, abort that update.
            if (pendingRequest) {
                pendingRequest.abort();
                pendingRequest = null;
            }

            // headRef must've changed, so we don't actually know the untilRevision anymore
            if (!currentUntilRevision) {
                // find the latest changeset where this file was changed.  This might not be the headRef itself.
                pendingRequest = getLatestFileRevision(currentPath, currentHeadRef);

                fileContent.reset(); // Destroy the view

                pendingRequest.always(function() {
                    pendingRequest = null;
                }).done(function(revision) {
                    currentUntilRevision = revision;
                    updateForState();
                });
            } else {
                initFileContent().then(initFauxScrollbar);
                updateChangesetBadge(currentUntilRevision);
            }
        }

        function initFileContent() {


            var options = $.extend({
                toolbarWebFragmentLocationPrimary: 'stash.file-content.'+ currentMode +'.toolbar.primary',
                toolbarWebFragmentLocationSecondary: 'stash.file-content.'+ currentMode +'.toolbar.secondary'
            }, FileContent[ currentMode + 'Preset']);

            options.relevantContextLines = relevantContextLines;

            var fileChange = new FileChange({
                commitRange: getCurrentCommitRange(),
                path: currentPath,
                repository: pageState.getRepository()
            });

            return fileContent.init(
                fileChange,
                currentHeadRef,
                getLineNumberFromHash(),
                options
            );
        }

        function initFauxScrollbar() {
            var isDiff = currentMode === FileContentModes.DIFF;
            var target = !isDiff && fileContent.$self.find('.source-container')[0];
            if (target) {
                fauxScrollbar.init(target, { hideAbove : false });
            } else {
                fauxScrollbar.destroy();
                fauxScrollbar = new FauxScrollbar();
            }
        }

        function updateChangesetBadge(untilRevision) {
            $('.branch-selector-toolbar .changeset-badge-container').empty().append(
                changesetBadge.create(untilRevision.toJSON(), pageState.getRepository().toJSON())
            ).fadeIn('fast');
        }

        function stateObject(path, headRef, untilRevision, mode) {
            return {
                path : path.toString(),
                headRef : headRef.toJSON(),
                untilRevision : untilRevision ? untilRevision.toJSON() : null,
                mode : mode
            };
        }

        function pushState(path, headRef, untilRevision, mode) {
            var urlBuilder = navbuilder.currentRepo();
            if (mode === FileContentModes.DIFF) {
                urlBuilder = urlBuilder.diff(
                    new FileChange({
                        commitRange: new CommitRange({
                            untilRevision : untilRevision // Since is the revision's parent but not needed in the URL
                        }),
                        path : path,
                        repository : pageState.getRepository()
                    })
                );
            } else {
                urlBuilder = urlBuilder.browse().path(path);
                if (untilRevision) {
                    urlBuilder = urlBuilder.until(untilRevision.getId());
                }
            }

            if (!headRef.isDefault()) {
                urlBuilder = urlBuilder.at(headRef.getId());
            }
            memoir.pushState(stateObject(path, headRef, untilRevision, mode), null, urlBuilder.build());
        }

        function getLineNumberFromHash() {
            var hash = window.location.hash,
                hashNumbers = hash.match(/#(\d+)/);
            return hashNumbers && Number(hashNumbers[1]);
        }

        function getLatestFileRevision(path, revisionReference) {

            var urlBuilder = navbuilder.rest()
                .currentRepo()
                .commit(revisionReference.getLatestChangeset());

            var xhr = ajax.rest({
                    url : urlBuilder.withParams({
                        path: path,
                        avatarSize: stash.widget.avatarSizeInPx({ size: 'xsmall' })
                    }).build(),
                    statusCode: {
                        '404': function() {
                            //HACK: this fallback shouldn't be necessary. We should always get a value.
                            // Actually, this case should happen when the revision doesn't exist on the branch you select.
                            // We should handle it differently.

                            return $.Deferred().resolve({
                                id : revisionReference.getId(),
                                displayId : revisionReference.getDisplayId(),
                                author : {"name": "Unknown"},
                                authorTimestamp : NaN
                            });
                        }
                    }
                }),
                pipedPromise = xhr.then(function(latestChangeset) {
                    return new Revision(latestChangeset);
                });
            deprecate.triggerDeprecated('stash.layout.branch.requestedRevisionData', null, 'stash.page.source.requestedRevisionData', '2.11', '3.0');
            events.trigger('stash.page.source.requestedRevisionData');
            return pipedPromise.promise(xhr);
        }

        memoir.initialState(stateObject(currentPath, currentHeadRef, currentUntilRevision, currentMode));

        initFileContent().then(initFauxScrollbar);

        events.on('stash.layout.branch.revisionRefChanged', function(revisionReference) {
            if (currentHeadRef !== revisionReference) {
                // the new commit reference isn't necessarily the changeset on which the file was changed.
                // we must find the latest one where it was changed. hence why untilRevision is null
                // Always revert back to source view - doesn't make sense to keep on diff view when switching branches.
                pushState(currentPath, revisionReference, null, "source");
            }
        });

        events.on('stash.feature.*.untilRevisionChanged', function(revision) {
            if (currentUntilRevision.getId() !== revision.getId()) {
                pushState(currentPath, currentHeadRef, revision, currentMode);
            }
        });

        events.on('stash.feature.*.requestedModeChange', function(mode) {
            if (currentMode !== mode) {
                pushState(currentPath, currentHeadRef, currentUntilRevision, mode);
            }
        });

        events.on('stash.feature.sourceview.onError', function(errors) {
            $('.branch-selector-toolbar .changeset-badge-container').fadeOut('fast');
        });

        events.on('stash.layout.*.urlChanged', function(url) {
            window.location = url;
            //TODO: pushState back to fileBrowser
            //events.trigger('stash.page.source.urlChanged', null, url);
        });
        events.on('stash.feature.*.urlChanged', function(url) {
            window.location = url;
            //TODO: pushState back to fileBrowser
            //events.trigger('stash.page.source.urlChanged', null, url);
        });

        events.on('stash.widget.branchselector.dialogShown', function () {
            dialogIsShowing = true;
        });
        events.on('stash.widget.branchselector.dialogHidden', function () {
            dialogIsShowing = false;
        });

        $(window).on('hashchange', function () {
            currentUrl = window.location.href;

            if (memoir.nativeSupport()) {
                memoir.replaceState(stateObject(currentPath, currentHeadRef, currentUntilRevision), null, currentUrl);
            }

            var number = window.location.hash.substring(1).match(/\d+/);
            events.trigger('stash.page.source.selectedLineChanged', null, number ? Number(number[0]) : null);
        });

        events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
            keyboardShortcuts.enableContext('sourceview');
            keyboardShortcuts.enableContext('diff-view');
        });

        listenForKeyboardShortcutRequests();
    };

    function listenForKeyboardShortcutRequests() {
        events.on('stash.keyboard.shortcuts.requestOpenParentHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                if (!dialogIsShowing) {
                    var $parentDir = $('.breadcrumbs').find('a:last');
                    if ($parentDir.length) {
                        if (memoir.nativeSupport()) {
                            $parentDir.click();
                        } else {
                            window.location.href = $parentDir.attr('href');
                        }
                    }
                }
            });
        });
    }
});
