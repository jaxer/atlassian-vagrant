define('feature/changeset/tree-and-diff-view', [
    'jquery',
    'util/events',
    'underscore',
    'util/deprecation',
    'model/conflict',
    'model/file-change',
    'model/file-content-modes',
    'model/page-state',
    'model/path',
    'feature/changeset/difftree',
    'feature/file-content',
    'exports'
], function(
    $,
    events,
    _,
    deprecate,
    Conflict,
    FileChange,
    FileContentModes,
    pageState,
    Path,
    difftree,
    FileContent,
    exports
) {
    var DiffTree = difftree.DiffTree,
        ROOT = "ROOT";

    var _options;

    //state
    var currentCommitRange,
        currentFilePath,
        changingState = false;

    // components/features/widgets
    var currentDiffTree,
        diffTreesByCommitRangeId = {}, //cache for diff-tree's created for different CommitRanges
        fileContent;

    // Selectors for resizing changesetPanes height and scrollbar & spinner
    var $window = $(window),
        $footer,
        $content,
        $container,
        $spinner,
        windowHeight,
        diffTreeMaxHeight,
        $changesetFileContent,
        $fileTreeContainer,
        $fileTreeWrapper,
        $fileTree,
        $contentView,
        $diffViewToolbar; // boolean for determining if the file tree is stalking or not

    function initFileContent($node) {
        var path = getPathFromNode($node),
            srcPath = getSrcPathFromNode($node),
            changeType = getChangeTypeFromNode($node),
            nodeType = getNodeTypeFromNode($node),
            conflict = getConflictFromNode($node),
            executable = getExecutableFromNode($node),
            srcExecutable = getSrcExecutableFromNode($node);

        if (!fileContent) {
            fileContent = new FileContent($container, "changeset-file-content");
        }

        var fileChange = new FileChange({
            repository :  pageState.getRepository(),
            commitRange : currentCommitRange,
            srcPath : srcPath,
            path : path,
            type : changeType,
            nodeType : nodeType,
            conflict : conflict,
            srcExecutable: srcExecutable,
            executable: executable
        });

        currentFilePath = path;

        $container.height($container.height());
        //temporarily set the height explicitly to the current height to stop the jump when the diffview is removed.
        //cleaned up in onTreeAndDiffViewSizeChanged
        var scrollTop = $window.scrollTop();

        return fileContent.init(fileChange, null, null, _options).done(function() {
            $changesetFileContent = $('#changeset-file-content');
            // Don't continue if we don't have a file-content area to work with
            if ($changesetFileContent.length === 0) {
                return;
            }
            $diffViewToolbar = $changesetFileContent.find('.file-toolbar');
            $contentView = $changesetFileContent.find('.content-view');

            scrollTop = scrollContentToTop(scrollTop);
            $window.scrollTop(scrollTop);
        });
    }

    function destroyFileContent() {
        var deferred = $.Deferred();
        currentFilePath = null;

        if (fileContent) {
            fileContent.destroy();
            fileContent = null;
        }

        $("#changeset-file-content").remove();

        return deferred.resolve();
    }

    function getPathFromNode($node) {
        return new Path($node.data('path'));
    }

    function getChangeTypeFromNode($node) {
        return $node.data('changeType');
    }

    function getNodeTypeFromNode($node) {
        return $node.data('nodeType');
    }

    function getSrcPathFromNode($node) {
        return new Path($node.data('srcPath'));
    }

    function getConflictFromNode($node) {
        return $node.data('conflict') && new Conflict($node.data('conflict'));
    }

    function getSrcExecutableFromNode($node) {
        return $node.data('srcExecutable');
    }

    function getExecutableFromNode($node) {
        return $node.data('executable');
    }

    function onTreeAndDiffViewSizeChanged() {
        windowHeight = $window.height();
        diffTreeMaxHeight = windowHeight - $('.diff-tree-toolbar').outerHeight();

        // update diff-tree height
        $fileTreeWrapper.css({'max-height': diffTreeMaxHeight + 'px', 'border-bottom-width': 0 });
    }

    function scrollContentToTop(scrollTop) {
        var diffOffset = $changesetFileContent.offset();
        if (diffOffset) { // Only try to get the offset if we can get it from the element.
            return Math.min(scrollTop, diffOffset.top);
        }
        return scrollTop;
    }

    // Trigger a state change to refresh the file currently shown in the diff view.
    // Use case: diff options have changed and a new representation of the file needs to be shown.
    events.on('stash.feature.diffview.optionsChanged', _.partial(onStateChange, true));

    /**
     * Change the state of the view based on whether the selected file is changed and if we have a current diff-tree
     *
     * We can force this to execute even if the selected file has not changed.
     * (useful when options have changed and the view needs to be reloaded)
     *
     * @param {boolean} [forceFileChanged]
     */
    function onStateChange(forceFileChanged) {
        changingState = true;

        var selectedPath = getPathFromUrl();

        var selectedFileChanged = (Boolean(selectedPath) ^ Boolean(currentFilePath)) || (selectedPath && selectedPath.toString() !== currentFilePath.toString());

        if ((selectedFileChanged || forceFileChanged === true ) && currentDiffTree) {
            currentDiffTree.selectFile(selectedPath.getComponents());
            var $node = currentDiffTree.getSelectedFile();
            if ($node && $node.length > 0) {
                initFileContent($node);
            }
        }

        changingState = false;
    }

    function updateDiffTree(optSelectedPathComponents) {
        if (!$spinner) {
            $spinner = $("<div class='spinner'/>");
        }
        $spinner.appendTo("#content .file-tree-wrapper").spin("large");
        return currentDiffTree.init(optSelectedPathComponents).always(function() {
            if ($spinner) {
                $spinner.spinStop().remove();
                $spinner = null;
            }
        }).done(function() {
            $fileTree = $('.file-tree');
            diffTreeMaxHeight = windowHeight - $('.diff-tree-toolbar').outerHeight();
            $fileTreeWrapper.css('max-height', diffTreeMaxHeight);
        });
    }

    function getPathFromUrl() {
        return new Path(window.location.hash.substring(1));
    }

    var toggleDiffTree;
    function initDiffTreeToggle() {
        var $toggle = $(".collapse-file-tree");
        var $changesetFilesContainer = $(".changeset-files");
        var $diffTreeContainer = $(".file-tree-container");
        var $toolbarItemPrimary = $diffTreeContainer.find('.aui-toolbar2-primary');

        var collapsed;


        function triggerCollapse() {
            events.trigger('stash.feature.changeset.difftree.collapseAnimationFinished', null, collapsed);
        }
        $diffTreeContainer.on('transitionend webkitTransitionEnd', triggerCollapse);
        var manualEventTrigger = ($.browser.msie && parseInt($.browser.version, 10) <= 9) ? _.debounce(triggerCollapse,0) : $.noop;


        toggleDiffTree = function() {
            if ($.browser.msie && parseInt($.browser.version, 10) <= 9 ) {
                /* IE 9 and below doesn't support CSS transitions, so the panel collapses immediately,
                 but while the heading fades out, the button wraps to the next line, then jumps up when the
                 animation completes, so we just toggle the visibility immediately */
                $toolbarItemPrimary.toggle();
            } else {
                /* all other browsers get a nice fade in/out of the header as the panel expands/collapses */
                $toolbarItemPrimary.fadeToggle();
            }

            $changesetFilesContainer.toggleClass('collapsed');

            collapsed = $changesetFilesContainer.hasClass('collapsed');
            events.trigger('stash.feature.changeset.difftree.toggleCollapse', null, collapsed);
            manualEventTrigger();
        };

        $toggle.on('click', function(e) {
            e.preventDefault();
            toggleDiffTree();
        });
    }

    function initDiffTree() {
        $('.no-changes-placeholder').remove();

        var filePath = currentFilePath ? currentFilePath : getPathFromUrl();
        return updateDiffTree(filePath.getComponents()).then(function(diffTree) {
            var $node = diffTree.getSelectedFile();
            if ($node && $node.length) {
                return initFileContent($node);
            } else {
                return destroyFileContent().done(function() {
                    /* Append a placeholder <div> to keep the table-layout so that
                       the diff-tree does not consume the entire page width */
                    $('.changeset-files').append($("<div class='message no-changes-placeholder'></div>").text(stash_i18n('stash.web.no.changes.to.show', 'No changes to show')));
                });
            }
        });
    }

    exports.updateCommitRange = function(commitRange) {
        if (commitRange.getId() === currentCommitRange.getId()) {
            // bail out if not actually changing the diff.
            return;
        }

        currentCommitRange = commitRange;
        currentDiffTree.reset(); // unbind any event listeners

        if (Object.prototype.hasOwnProperty.call(diffTreesByCommitRangeId, currentCommitRange.getId())){
            // Use cached difftree if it exists.
            currentDiffTree = diffTreesByCommitRangeId[currentCommitRange.getId()];
        } else {
            currentDiffTree = new DiffTree(".file-tree-wrapper", currentCommitRange, {
                maxChanges : _options.maxChanges,
                hasOtherParents : _options.numberOfParents > 1
            });
            diffTreesByCommitRangeId[currentCommitRange.getId()] = currentDiffTree;
        }

        initDiffTree();
    };

    function onSelectedNodeChanged($node, initializingTree) {
        // Only set the hash if we're here from a user clicking a file name.
        // If it's a popState or a pushState or hashchange, the hash should already be set correctly.
        // If we're initializing a full tree, we want an empty hash.
        // If we're initializing a full tree BECAUSE of a changeState, the hash should still already be set correctly.
        if (!changingState && !initializingTree) {
            window.location.hash = $node ? getPathFromNode($node).toString() : "";
        }
    }

    function onRequestToggleDiffTreeHandler(keys) {
        if ($.browser.msie && parseInt($.browser.version, 10) === 9) {
            // IE9 crashes when you type 't'. "IE crash?! That's unpossible!" you cry.
            // But it's true. The browser executes the full call stack, then crashes before
            // debouncedToggleEvent is called. If you set a breakpoint in that call stack though, it
            // often does NOT crash. The crash doesn't occur without the 'collapsed' class being added.
            // But it only occurs when trigger from the keyboard shortcut (and setTimeout hackery doesn't help).
            return;
        }
        (this.execute ? this : AJS.whenIType(keys)).execute(toggleDiffTree);
    }

    function onRequestMoveToNextHandler(keys) {
        (this.execute ? this : AJS.whenIType(keys)).execute(function() {
            currentDiffTree.openNextFile();
        });
    }

    function onRequestMoveToPreviousHandler(keys) {
        (this.execute ? this : AJS.whenIType(keys)).execute(function() {
            currentDiffTree.openPrevFile();
        });
    }

    exports.init = function(commitRange, options) {
        _options = $.extend({}, exports.defaults, options);

        $footer = $("#footer");
        $content = $("#content");
        $container = $content.find(".changeset-files");
        $fileTreeContainer = $('.file-tree-container');
        $fileTreeWrapper = $fileTreeContainer.children('.file-tree-wrapper');
        windowHeight = $window.height();
        $changesetFileContent = $('#changeset-file-content');

        currentCommitRange = commitRange;
        currentDiffTree = new DiffTree(".file-tree-wrapper", currentCommitRange, {
            maxChanges : _options.maxChanges,
            hasOtherParents : _options.numberOfParents > 1
        });
        diffTreesByCommitRangeId[currentCommitRange.getId()] = currentDiffTree;
        currentFilePath = getPathFromUrl();

        $window.on('hashchange', onStateChange);

        events.on("window.resize", onTreeAndDiffViewSizeChanged);
        events.on("stash.feature.fileContent.diffViewExpanded", onTreeAndDiffViewSizeChanged);
        events.on('stash.feature.changeset.difftree.selectedNodeChanged', onSelectedNodeChanged);

        initDiffTreeToggle();
        initDiffTree();

        events.on('stash.keyboard.shortcuts.requestToggleDiffTreeHandler', onRequestToggleDiffTreeHandler);
        events.on('stash.keyboard.shortcuts.requestMoveToNextHandler', onRequestMoveToNextHandler);
        events.on('stash.keyboard.shortcuts.requestMoveToPreviousHandler', onRequestMoveToPreviousHandler);
    };

    exports.reset = function() {
        if (currentDiffTree) {
            currentDiffTree.reset();
        }

        currentCommitRange = undefined;
        currentDiffTree = undefined;
        diffTreesByCommitRangeId = {};
        currentFilePath = undefined;

        $window.off('hashchange', onStateChange);

        events.off("window.resize", onTreeAndDiffViewSizeChanged);
        events.off("stash.feature.fileContent.diffViewExpanded", onTreeAndDiffViewSizeChanged);
        events.off('stash.feature.changeset.difftree.selectedNodeChanged', onSelectedNodeChanged);

        events.off('stash.keyboard.shortcuts.requestToggleDiffTreeHandler', onRequestToggleDiffTreeHandler);
        events.off('stash.keyboard.shortcuts.requestMoveToNextHandler', onRequestMoveToNextHandler);
        events.off('stash.keyboard.shortcuts.requestMoveToPreviousHandler', onRequestMoveToPreviousHandler);

        return destroyFileContent();
    };

    /**
     * @deprecated since 2.0. Use init() instead.
     * @type {Function}
     */
    exports.onReady = deprecate.fn(exports.init, 'feature/changeset/tree-and-diff-view::onReady', 'feature/changeset/tree-and-diff-view::init', '2.0', '3.0');

    exports.defaults = {
        breadcrumbs : true,
        sourceLink : true,
        changeTypeLozenge : true,
        changeModeLozenge : true,
        contentMode : FileContentModes.DIFF,
        toolbarWebFragmentLocationPrimary : null,
        toolbarWebFragmentLocationSecondary : null
    };

    exports.commentMode = FileContent.commentMode;
});
