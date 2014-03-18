define('widget/branch-selector-dialog', [
    'aui',
    'jquery',
    'widget/branch-selector',
    'model/page-state',
    'util/events',
    'util/deprecation'
], function(
    AJS,
    $,
    BranchSelector,
    pageState,
    events,
    deprecate
    ) {

    /**
     * @deprecated since 2.4. Removal in 3.0.
     * Use feature/repository/revision-reference-selector or feature/repository/branch-selector instead.
     * @type {Function}
     */
    function BranchSelectorDialog(branchSelectorTriggerSelector, dialogId, options) {
        var self = this;

        /**
            projectKey         : project key of the repo the branch selector is for
            repoSlug           : repository slug of the branch selector
            branchesOnly       : only show branches and not tags
            branchSelectorOpts : options for the branch selector
         */
        var defaults = {
            projectKey: pageState.getProject().getKey(),
            repoSlug: pageState.getRepository().getSlug(),
            branchesOnly: false,
            branchSelectorOpts: {}
        };

        var opts = this.options = $.extend(true, {}, defaults, options);

        var branchy = this.branchSelector = new BranchSelector(opts.projectKey, opts.repoSlug, opts.branchSelectorOpts);
        var $button = this.$button = $(branchSelectorTriggerSelector);

        var inlineDialog = this.inlineDialog = AJS.InlineDialog($button, dialogId, function (content, trigger, showPopup) {
            content.html(stash.widget.branchSelector({ branchesOnly : opts.branchesOnly }));
            content.addClass('branch-selector-contents');
            showPopup();
            // No way of determining that the popup has _actually_ been rendered yet.
            setTimeout(function () {
                branchy.init(content);
                branchy.populateBranchList();
                branchy.focusFilter();
            }, 0);
        }, {
            hideDelay: null,
            width: 270,
            hideCallback: function() {
                if ($(document.activeElement).closest(branchy._context).length) {
                    // if the focus is inside the dialog, you get stuck when it closes.
                    document.activeElement.blur();
                }
                $(document).add(inlineDialog).off('keydown', hideOnEscape);
                events.trigger('stash.widget.branchselector.dialogHidden', this);
            },
            initCallback: function() {
                // Bind to both the document and the inline dialog because we need to stop
                // the bubbling of the event before it reaches the document as to trigger
                // other ESC handlers. We listen for keydown because that is what AUI is doing
                // in dialog.js
                $(document).add(inlineDialog).on('keydown', hideOnEscape);
                events.trigger('stash.widget.branchselector.dialogShown', this);
            },
            calculatePositions: function (popup, targetPosition, mousePosition, opts) {
                // CONSTANTS
                var ARROW_WIDTH = 16,
                    ARROW_HEIGHT = 8;

                var branchSelectorButton = targetPosition.target.closest('.branch-selector-trigger'),
                    buttonOffset = branchSelectorButton.offset(),
                    buttonWidth = branchSelectorButton.outerWidth(),
                    buttonHeight = branchSelectorButton.outerHeight();

                var popupLeft = buttonOffset.left,
                    arrowTop = -ARROW_HEIGHT + 1,
                    popupTop = buttonOffset.top + buttonHeight + ARROW_HEIGHT,
                    arrowLeft = (buttonWidth / 2) - (ARROW_WIDTH / 2);

                return {
                    displayAbove: false,
                    popupCss: {
                        left: popupLeft,
                        top: popupTop
                    },
                    arrowCss: {
                        top: arrowTop,
                        left: arrowLeft
                    }
                };
            }
        });

        //at a later date we might want to consider extending inline dialog with this behaviour
        function hideOnEscape(e) {
            if(e.keyCode === $.ui.keyCode.ESCAPE) {
                // If the branch selector is in a modal dialog, We want to only close the selector
                // They should be able to hit ESC again to close the modal dialog
                e.stopImmediatePropagation();
                inlineDialog.hide();
            }
        }

        //ALSO urgh, but inline dialogs api is kind of crappy
        events.on("stash.widget.branchselector.revisionRefChanged", function (revisionReference) {
            if (this === branchy) {
                inlineDialog.hide();
                $button.focus();
            }
        });

        events.on("stash.widget.branchselector.repoChanged", function() {
            if (this === branchy) {
                inlineDialog.hide();
                self.clearSelection();
            }
        });
    }

    BranchSelectorDialog.prototype.updateSelectedRevisionReference = function(revisionReference) {
        if (revisionReference) {
            this.$button.attr("title", revisionReference.getTypeName() + ': ' + revisionReference.getDisplayId());
            this.$button.find(".ref-type-icon")
                .toggleClass('aui-iconfont-devtools-branch', revisionReference.isBranch())
                .toggleClass('aui-iconfont-devtools-tag', revisionReference.isTag());
            this.$button.find(".ref-name").text(revisionReference.getDisplayId());
        } else {
            this.clearSelection();
        }
    };

    BranchSelectorDialog.prototype.clearSelection = function() {
        this.$button.attr('title', '');
        this.$button.removeClass('aui-iconfont-devtools-tag').addClass('aui-iconfont-devtools-branch');
        this.$button.find('.ref-name').text(stash_i18n('stash.web.branchselector.default', 'Select Branch'));
    };

    return deprecate.construct(BranchSelectorDialog, "widget/branch-selector-dialog", "feature/repository/revision-reference-selector or feature/repository/branch-selector", "2.4", "3.0");
});
