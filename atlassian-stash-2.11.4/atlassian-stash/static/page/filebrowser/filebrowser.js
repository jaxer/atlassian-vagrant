define('page/filebrowser', [
    'jquery',
    'aui',
    'util/events',
    'memoir',
    'feature/filebrowser/file-table',
    'feature/filebrowser/file-finder',
    'model/revision-reference',
    'model/path',
    'model/content-tree-node-types',
    'exports'
], function(
    $,
    AJS,
    events,
    memoir,
    filetable,
    finder,
    RevisionReference,
    Path,
    ContentNodeType,
    exports
) {

    var FileTable = filetable.FileTable,
        FileTableView = filetable.FileTableView,
        FileFinder = finder.FileFinder,
        dialogIsShowing;

    var fileTable,
        fileTableView,
        fileFinder;

    var findFilesTooltip,
        browseFilesTooltip,
        $findFilesItem,
        $content,
        $findFilesButton,
        $browseFilesButton;

    function getFileNamesFromDOM() {
        return $content.find(".file-row a").map(function (i, row) {
            var $row = $(row);
            var $parent = $row.parent().parent();
            return {name: $row.text(), contentId: $row.attr('data-contentId'),
                type: $parent.hasClass('file') ? ContentNodeType.FILE : $parent.hasClass('directory') ? ContentNodeType.DIRECTORY : ContentNodeType.SUBMODULE};
        });
    }

    exports.onReady = function(path, revisionRef, fileTableContainer) {

        var currentPath = new Path(path),
            currentRevisionRef = new RevisionReference(revisionRef);

        $findFilesItem = $('.find-files');
        $content = $('.filebrowser-content');
        $findFilesButton = $findFilesItem.find('.find-files-button');
        $browseFilesButton = $findFilesItem.find('.browse-files-button');

        fileTableView = new FileTableView(fileTableContainer);

        fileTable = new FileTable(currentPath, currentRevisionRef);

        fileFinder = new FileFinder(fileTableContainer, currentRevisionRef);

        $(document).on('focus', '#browse-table tr.file-row', function() {
            $('.focused-file').removeClass('focused-file');
            $(this).addClass('focused-file');
        });

        events.on('memoir.popstate', function(e) {
            if (e.state) {
                currentRevisionRef = new RevisionReference(e.state.revisionRef);
            } // else ignore hashchange events
        });

        var pipeRevisionChanged = function(revisionReference) {
            if (currentRevisionRef !== revisionReference) {
                currentRevisionRef = revisionReference;
                events.trigger('stash.page.filebrowser.revisionRefChanged', null, revisionReference);
            }
        };
        events.on('stash.layout.branch.revisionRefChanged', pipeRevisionChanged);
        events.on('stash.feature.filetable.revisionRefChanged', pipeRevisionChanged);

        events.on('stash.widget.branchselector.dialogShown', function () {
            dialogIsShowing = true;
        });
        events.on('stash.widget.branchselector.dialogHidden', function () {
            dialogIsShowing = false;
        });

        var pipeUrlChanged = function(url) {
            events.trigger('stash.page.filebrowser.urlChanged', null, url);
        };
        events.on('stash.layout.*.urlChanged', pipeUrlChanged);
        events.on('stash.feature.*.urlChanged', pipeUrlChanged);

        events.on('stash.feature.*.pathChanged', function(path) {
            currentPath = path;
            events.trigger('stash.page.filebrowser.pathChanged', null, currentPath);
        });

        events.on('stash.widget.keyboard-shortcuts.register-contexts', function(keyboardShortcuts) {
            keyboardShortcuts.enableContext('filebrowser');
        });

        var showFinder = function () {
            if (!fileFinder.isLoaded()) {
                $findFilesButton.attr('aria-pressed', true);
                $browseFilesButton.attr('aria-pressed', false);

                fileFinder.loadFinder();
            }
        };

        var hideFinder = function() {
            if (fileFinder.isLoaded()) {
                $findFilesButton.attr('aria-pressed', false);
                $browseFilesButton.attr('aria-pressed', true);

                fileFinder.unloadFinder();

                if (fileTable.data) {
                    fileTableView.update(fileTable.data);
                }
                else {
                    fileTable.reload();
                }
            }
        };

        events.on('stash.feature.filetable.showFind', showFinder);
        events.on('stash.feature.filetable.hideFind', hideFinder);
        //If the revision has changed, close the file finder and show the browse file link
        events.on('stash.page.filebrowser.revisionRefChanged', hideFinder);

        /**
         * Notify listeners of the initial files and when there are subsequent changes.
         */
        events.trigger('stash.feature.filebrowser.filesChanged', null, {
            files:getFileNamesFromDOM(),
            path:new Path(path),
            revision: currentRevisionRef.getId()
        });
        events.on('stash.feature.filetable.dataReceived', function (data) {
            if (isDataReceivedErrorResponse(data)) {
                return;
            }
            events.trigger('stash.feature.filebrowser.filesChanged', null, { files: data.children.values, path: data.path, revision: data.revision });
        });

        $findFilesButton.click(function () {
            events.trigger('stash.feature.filetable.showFind');
            return false;
        });

        $browseFilesButton.click(function () {
            events.trigger('stash.feature.filetable.hideFind');
            return false;
        });

        listenForKeyboardShortcutRequests();
    };

    /**
     * Indicate whether the data object from a dataReceived event is an error response
     *
     * @param {object} [data]
     * @returns {boolean}
     */
    function isDataReceivedErrorResponse(data) {
        return !(data && data.children);
    }

    function listenForKeyboardShortcutRequests() {
        var options = {
            "focusedClass": "focused-file",
            "wrapAround": false,
            "escToCancel": false
        },
        rowSelector = "#browse-table tr.file-row",
        focusedRowSelector = rowSelector + '.' + options.focusedClass;

        events.on('stash.keyboard.shortcuts.requestMoveToNextHandler', function(keys) {
            (this.moveToNextItem ? this : AJS.whenIType(keys)).moveToNextItem(rowSelector, options);
        });
        events.on('stash.keyboard.shortcuts.requestMoveToPreviousHandler', function(keys) {
            (this.moveToPrevItem ? this : AJS.whenIType(keys)).moveToPrevItem(rowSelector, options);
        });
        events.on('stash.keyboard.shortcuts.requestOpenItemHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                if (!dialogIsShowing) {
                    var $focusItem = $(focusedRowSelector);
                    if ($focusItem.length) {
                        if ($focusItem.hasClass('file') || !memoir.nativeSupport()) {
                            events.trigger('stash.feature.filetable.showSpinner', this);
                            window.location.href = $focusItem.find('a').attr('href');
                        } else {
                            $focusItem.find('a').click();
                        }
                    }
                }
            });
        });
        events.on('stash.keyboard.shortcuts.requestOpenParentHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                if (!dialogIsShowing) {
                    var $parentDir = $(fileTableView.getParentDirSelector());
                    if ($parentDir.length) {
                        if (memoir.nativeSupport()) {
                            $parentDir.click();
                        } else {
                            events.trigger('stash.feature.filetable.showSpinner', this);
                            window.location.href = $parentDir.attr('href');
                        }
                    }
                }
            });
        });

        events.on('stash.keyboard.shortcuts.requestOpenFileFinderHandler', function (keys) {
            findFilesTooltip = stash_i18n('stash.web.filefinder.findfiles.tooltip',
                "Find files in this repository (Type ''{0}'')", keys);
            $findFilesButton.attr('title', findFilesTooltip);

            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                events.trigger('stash.feature.filetable.showFind', this);
            });
        });
        events.on('stash.keyboard.shortcuts.requestCloseFileFinderHandler', function (keys) {
            browseFilesTooltip = stash_i18n('stash.web.filefinder.browse.files.tooltip',
                "Browse files in this repository (Type ''{0}'')", keys);
            $browseFilesButton.attr('title', browseFilesTooltip);

            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                events.trigger('stash.feature.filetable.hideFind', this);
            });
        });
    }
});
