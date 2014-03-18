define('layout/repository', [
    'jquery',
    'aui',
    'util/events',
    'util/navbuilder',
    'model/page-state',
    'model/repository',
    'feature/repository/sticky-branches',
    'widget/quick-copy-text',
    'exports'
], function(
    $,
    AJS,
    events,
    navbuilder,
    pageState,
    Repository,
    stickyBranches,
    quickCopyText,
    exports
) {

    function initRepositoryPageState(repositoryJson) {
        var repo = new Repository(repositoryJson);
        pageState.setRepository(repo);
        pageState.setProject(repo.getProject());
    }

    function getCloneUrlContainer() {
        return $('.clone-url');
    }

    function getCloneUrlProtocolTrigger() {
        return $('.repository-protocol');
    }

    /**
     * Input elements can't be sized to fit their contents, so we have to use a bit of javascript to do it for us.
     * This method creates a fake element to calculate the size of one monospace character and then sets the width
     * of the input element to be input.length * width. There are a few rounding issues on some browsers but should
     * be good enough for the most part.
     *
     * Finally, this method also binds events to focus/mouseup to automatically select the input text for the
     * convenience of the user who is going to want to copy the value.
     */
    function initCloneUrlInput() {
        var $container = getCloneUrlContainer(),
            $cloneInput = $container.find("input"),
            $cloneProtocolTrigger = getCloneUrlProtocolTrigger(),
            $cloneProtocolDropdown = $('#' + $cloneProtocolTrigger.attr("aria-owns")),
            $cloneProtocolDropdownItems = $cloneProtocolDropdown.find('li'),
            cloneUrl,
            moduleKey,
            oldModuleKey = '';

        if($cloneProtocolTrigger.is('button')) {
            updateCloneProtocolTrigger($cloneProtocolTrigger, $cloneProtocolTrigger.text());
            cloneUrl = $cloneProtocolTrigger.attr('data-clone-url');
            moduleKey = $cloneProtocolTrigger.attr('data-module-key');
        } else {
            updateCloneProtocolTrigger($cloneProtocolTrigger, $cloneProtocolDropdownItems.first().children('a').text());
            cloneUrl = $cloneProtocolDropdownItems.first().attr('data-clone-url');
            moduleKey = $cloneProtocolDropdownItems.first().attr('data-module-key');
        }
        $cloneInput.val(cloneUrl);
        $container.addClass(moduleKey);
        oldModuleKey = moduleKey;

        $cloneProtocolDropdownItems.on('click', function(event) {
            var $this = $(this);
            updateCloneProtocolTrigger($cloneProtocolTrigger, $this.text());
            $cloneInput.val($this.attr('data-clone-url')).select();
            moduleKey= $this.attr('data-module-key');
            $container.removeClass(oldModuleKey).addClass(moduleKey);
            oldModuleKey = moduleKey;
            events.trigger('stash.feature.repository.clone.protocol.changed', null, moduleKey, $this.attr('data-clone-url'));

            // the dropdown is outside of the inline dialog, so clicking on a dropdown item actually hides the inline
            // dialog, so we prevent that from happening...
            event.stopPropagation();
            if ($cloneProtocolDropdown.is(':visible')) { // but we still want to hide the dropdown onclick if it is visible
                $cloneProtocolTrigger.trigger("aui-button-invoke");
            }
            event.preventDefault();
        });

        events.trigger('stash.feature.repository.clone.protocol.initial', null, moduleKey, cloneUrl);

    }

    function updateCloneProtocolTrigger(trigger, newLabel) {
        var $cloneProtocolLabel = trigger.children('span').remove(); // pull the icon span element out and store it temporarily
        trigger.text(newLabel).append($cloneProtocolLabel); // replace the dropdown trigger text and add the icon span back in
    }

    function initCloneUrlDialog(cloneUrlDialogTrigger, cloneUrlDialogContent) {
        var $button = $(cloneUrlDialogTrigger);

        var $dialogContent = $(cloneUrlDialogContent);

        var dialog = AJS.InlineDialog($button, "clone-repo-dialog", function (content, trigger, showPopup) {
            content.append($dialogContent);
            showPopup();
            _.defer(function() {
                $dialogContent.find('.clone-url input').select();
            });
        }, {
            width: 360,
            offsetY: 7,
            hideCallback: function() { // hide the dropdown (if it is visible) when the inline dialog is hidden
                var $cloneProtocolTrigger = getCloneUrlProtocolTrigger(),
                    $cloneProtocolDropdown = $('#' + $cloneProtocolTrigger.attr("aria-owns"));

                if ($cloneProtocolDropdown.is(':visible')) {
                    $cloneProtocolTrigger.trigger("aui-button-invoke");
                }
            }
        });

        $(document).keyup(function(e) {
           if(e.keyCode === $.ui.keyCode.ESCAPE) {
               dialog.hide();
           }
        });

        $dialogContent
            .find("a.sourcetree-clone-button")
            .on('click', function () {
                dialog.hide();
          });
    }

    function bindCreatePullRequestButton() {
        var $createButton = $(".aui-page-header-actions .create-pull-request");

        events.on('stash.layout.branch.revisionRefChanged', function(revisionReference) {
            var createPullRequestBuilder = navbuilder.currentRepo().createPullRequest();
            if (!revisionReference.isDefault() && revisionReference.isBranch()) {
                createPullRequestBuilder = createPullRequestBuilder.sourceBranch(revisionReference.getId());
            }
            $createButton.attr('href', createPullRequestBuilder.build());
        });
    }

    function bindBadgesTipsy() {
        $('.repository-badge .badge').tooltip({
            gravity: 'n'
        });
    }

    exports.onReady = function(repositoryJson, cloneUrlDialogTrigger, cloneUrlDialogContent) {
        initRepositoryPageState(repositoryJson);
        initCloneUrlInput();
        quickCopyText.onReady();
        stickyBranches.onReady();
        initCloneUrlDialog(cloneUrlDialogTrigger, cloneUrlDialogContent);
        bindCreatePullRequestButton();
        bindBadgesTipsy();
    };
});
