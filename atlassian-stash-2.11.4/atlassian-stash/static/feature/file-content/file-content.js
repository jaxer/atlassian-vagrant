define('feature/file-content', [
    'jquery',
    'underscore',
    'memoir',
    'require',
    'util/deprecation',
    'util/dom-event',
    'util/events',
    'util/promise',
    'util/navbuilder',
    'feature/comments',
    'stash/api/feature/files/file-handlers',
    'model/file-change-types',
    'model/file-content-modes',
    'model/content-tree-node-types'
], function(
    $,
    _,
    memoir,
    require,
    deprecate,
    eventUtil,
    events,
    promise,
    navbuilder,
    comments,
    fileHandlers,
    ChangeType,
    FileContentModes,
    ContentNodeType
) {

    function getRawUrl(path, revisionRef) {
        var urlBuilder = navbuilder
               .currentRepo()
               .browse()
               .path(path);

        if (revisionRef && !revisionRef.isDefault()) {
            urlBuilder = urlBuilder.at(revisionRef.getId());
        }

        return urlBuilder.raw().build();
    }

    function FileContent(containerSelector, id) {

        var self = this;

        this._id = id || undefined;
        this._containerSelector = containerSelector;

        events.on('stash.feature.filehistory.revisionSelected', function(revision) {
            if (this === self.untilRevisionPicker) {
                events.trigger('stash.feature.filecontent.untilRevisionChanged', self, revision);
            }
        });

        this._lastInitPromise = promise.thenAbortable($.Deferred().resolve());
    }

    /**
     * @deprecated since 2.8 for removal in 3.0.
     */
    FileContent.contentType = $.extend({}, FileContentModes);
    deprecate.obj(FileContent.contentType, 'FileContent.contentType.', "require('model/file-content-modes')::", '2.8', '3.0');

    // These are only implemented in diffs currently, not source.
    FileContent.commentMode = comments.commentMode;

    FileContent.diffPreset = {
        contentMode : FileContentModes.DIFF,
        untilRevisionPicker : true,
        rawLink : false,
        sourceLink : false,
        modeToggle : true,
        changeTypeLozenge : false,
        changeModeLozenge : false,
        breadcrumbs : false,
        commentMode : FileContent.commentMode.NONE
    };

    FileContent.sourcePreset = {
        contentMode : FileContentModes.SOURCE,
        untilRevisionPicker : true,
        rawLink : true,
        sourceLink : false,
        modeToggle : true,
        changeTypeLozenge : false,
        changeModeLozenge : false,
        breadcrumbs : false,
        commentMode : FileContent.commentMode.NONE
    };

    FileContent.defaults = {
        contentMode : FileContentModes.SOURCE,
        untilRevisionPicker : false,
        rawLink : false,
        sourceLink : false,
        modeToggle : false,
        changeTypeLozenge : false,
        changeModeLozenge : false,
        fileIcon : false,
        breadcrumbs : false,
        scrollPaneSelector : undefined,
        commentMode : FileContent.commentMode.REPLY_ONLY,
        pullRequestDiffLink: false,
        toolbarWebFragmentLocationPrimary : null,
        toolbarWebFragmentLocationSecondary : null
    };

    FileContent.prototype.initToolbarItems = function (headRef, fileChange) {
        var $container = $(this._containerSelector);
        var untilRevision = fileChange.getCommitRange().getUntilRevision();
        var $self = $(stash.feature.fileContent.main($.extend({
            id: this._id,
            preloaded : !!fileChange.getDiff(),
            sourceUrl : this._options.sourceUrl || this._options.modeToggle ? navbuilder
                            .currentRepo()
                            .browse()
                            .path(fileChange.getPath())
                            .at(headRef.getDisplayId())
                            .until(untilRevision && untilRevision.getId())
                            .build() :
                            '',
            diffUrl : this._options.modeToggle ? navbuilder
                        .currentRepo()
                        .diff(fileChange)
                        .at(headRef.getDisplayId())
                        .build() :
                        '',
            fileChange : fileChange.toJSON(),
            commentMode : this._options.commentMode
        }, this._options)));


        this.$self && this.$self.remove();
        this.$self = $self.appendTo($container);

        this._initCommands();

        if (this._options.breadcrumbs) {
            this.$breadcrumbs = $self.find(".breadcrumbs");
        } else {
            this.$breadcrumbs = null;
        }

        if (this._options.changeTypeLozenge) {
            this.$changeTypeLozenge = $self.find(".change-type-placeholder");
        } else {
            this.$changeTypeLozenge = null;
        }

        if (this._options.changeModeLozenge) {
            this.$changeModeLozenge = $self.find(".change-mode-placeholder");
        } else {
            this.$changeModeLozenge = null;
        }

        if (this._options.sourceLink) {
            this.$viewSource = $self.find(".source-view-link").tooltip({
                gravity: 'ne'
            });
        } else {
            this.$viewSource = null;
        }

        if (this._options.pullRequestDiffLink) {
            $self.find(".pull-request-diff-outdated-lozenge").tooltip({
                gravity: 'ne'
            });
        }
    };

    FileContent.prototype._initCommands = function() {
        var $contentView = this.$self.children('.content-view');
        var $toolbar = this.$toolbar = this.$self.children('.file-toolbar');

        if (this._options.scrollPaneSelector === 'self') {
            $contentView.addClass('scroll-x');
        }

        if (this.untilRevisionPicker) {
            this.untilRevisionPicker.destroy();
        }
        if (this._options.untilRevisionPicker) {
            var FileHistory = require('feature/file-content/file-history');

            this.untilRevisionPicker = new FileHistory($toolbar.find('.until-changeset-button'), 'until-changeset');
        } else {
            this.untilRevisionPicker = null;
        }

        if (this._options.rawLink) {
            this.$viewRaw = $toolbar.find('.raw-view-link');
        } else {
            this.$viewRaw = null;
        }

        if (this._options.modeToggle) {
            this.$modeToggle = $toolbar.find('.mode-toggle').tooltip({
                gravity: 'ne'
            });
        } else {
            this.$modeToggle = null;
        }

        this.$sourceButton = $toolbar.find('.mode-source');
        this.$diffButton = $toolbar.find('.mode-diff');
        this.$commentButton = $toolbar.find('.add-file-comment-trigger');

        this.$commentButton.on('click', function() {
            var commentContext = $contentView.data('comment-context');
            if (commentContext) {
                commentContext.addFileCommentClicked();
            }
        }).tooltip({
            gravity: 'ne'
        });
    };

    FileContent.prototype.initForContent = function(headRef, fileChange, lineNumber) {
        var untilRevision = fileChange.getCommitRange().getUntilRevision();

        if (this.$viewSource) {
            if (fileChange.getType() === ChangeType.DELETE || fileChange.getNodeType() === ContentNodeType.SUBMODULE) {
                this.$viewSource.addClass("hidden");
            } else {
                this.$viewSource.attr('href', navbuilder
                    .currentRepo()
                    .browse()
                    .path(fileChange.getPath())
                    .at(untilRevision && untilRevision.getId())
                    .build());
            }
        }

        if (this.$viewRaw) {
            this.$viewRaw.attr('href', getRawUrl(fileChange.getPath(), untilRevision && untilRevision.getRevisionReference()));
        }

        if (this.untilRevisionPicker) {
            this.untilRevisionPicker.init(fileChange.getPath(), untilRevision && untilRevision.getRevisionReference(), headRef);
        }

        if (this.$breadcrumbs) {
            this.$breadcrumbs.html(this.renderBreadCrumbs(fileChange.getPath()));
        }

        if (this.$changeTypeLozenge) {

            var srcPath = fileChange.getSrcPath();

            if (fileChange.getType() === ChangeType.RENAME) {
                srcPath = srcPath.getName();
            } else {
                srcPath = '/' + srcPath.getComponents().join('/<wbr>');
            }

            this.$changeTypeLozenge.append(stash.feature.fileContent.fileChangeTypeLozenge({
                changeType : fileChange.getType(),
                previousPath : srcPath
            }));
            this.$changeTypeLozenge.find('.change-type-lozenge').tooltip({html: true});
        }

        if (this.$changeModeLozenge) {
            var lozenge = this.getFileChangedModeLozenge(fileChange);
            if (lozenge) {
                this.$changeModeLozenge.append($(lozenge).tooltip());
            }
        }

        if (this.$modeToggle && memoir.nativeSupport()) {
            this.$modeToggle.on('click', 'a:not(.active,.disabled)', function(e) {
                if (!eventUtil.openInSameTab(e)) {
                    return;
                }
                e.preventDefault();
                events.trigger('stash.feature.filecontent.requestedModeChange', this, $(this).hasClass('mode-diff') ? FileContentModes.DIFF : FileContentModes.SOURCE);
            });
        }

        // See README for more documentation - please update if changing this
        var fileOpts = {
            fileChange: fileChange.toJSON(),
            $container: this.$self.children('.content-view'),
            targetLine: lineNumber > 0 ? lineNumber - 1 : null,
            contentMode: this._options.contentMode,
            commentMode: this._options.commentMode,
            lineComments: this._options.lineComments,
            relevantContextLines: this._options.relevantContextLines,
            isExcerpt: !!this._options.isExcerpt,
            enable: _.bind(this.toggleDisable, this, false),
            disable: _.bind(this.toggleDisable, this, true)
        };

        var $spinner = $("<div />").addClass('file-content-spinner').appendTo(this.$self);
        return promise.spinner($spinner, fileHandlers._handle(fileOpts).done(_.bind(function (data) {
            if (data.extraClasses) {
                this.$self.addClass(data.extraClasses);
                this.extraClasses = data.extraClasses;
            }
            this.destroyView = _.isFunction(data.destroy) ? _.bind(data.destroy, data) : $.noop;
        }, this)), 'large');
    };

    FileContent.prototype.toggleDisable = function(disable) {
        this.$self.find('.file-toolbar .aui-button')
            .toggleClass('disabled', disable)
            .prop('disabled', disable); // prop doesn't work on anchors

        if (disable) {
            events.trigger('stash.feature.filecontent.disabled', this, this.$self);
        } else {
            events.trigger('stash.feature.filecontent.enabled', this, this.$self);
        }
    };

    FileContent.prototype.renderBreadCrumbs = function(path) {
        var components = _.map(path.getComponents(), function(str) {
            return { text: str };
        });
        return stash.widget.breadcrumbs.crumbs({
            pathComponents: components,
            primaryLink: this._options.pullRequestDiffLinkUrl
        });
    };

    FileContent.prototype.getFileChangedModeLozenge = function(fileChange) {
        var srcExecutable = fileChange.getSrcExecutable(),
            executable = fileChange.getExecutable();

        // executable can be null if the file has been deleted. We want to show the lozenge when a file has been
        // added and is executable, but not when the it has been deleted or when a file has been added without +x
        var added = null;

        if ((srcExecutable == null && executable === true) ||
            (srcExecutable === false && executable === true)) {
            added = true;
        } else if (srcExecutable === true && executable === false) {
            added = false;
        }

        if (added !== null) {
            return $(stash.feature.fileContent.fileChangeModeLozenge({
                added : added
            }));
        }
        return null;
    };

    FileContent.prototype.init = function(fileChange, optHeadRef, optLineNumber, options) {
        var initInternal = this._initInternal.bind(this, fileChange, optHeadRef, optLineNumber, options);
        this._lastInitPromise = this.reset().thenAbortable(initInternal, initInternal);
        return this._lastInitPromise;
    };

    FileContent.prototype._initInternal = function(fileChange, optHeadRef, optLineNumber, options) {
        options = this._options = $.extend({}, FileContent.defaults, options);

        var commitRange = fileChange.getCommitRange(),
            headRef = optHeadRef || commitRange.getUntilRevision() && commitRange.getUntilRevision().getRevisionReference();

        if (options.changeTypeLozenge && !fileChange.getType()) {
            throw new Error("Change type is required to show the change type lozenge.");
        }

        if (!commitRange.getUntilRevision() && (options.sourceLink || options.rawLink || options.untilRevisionPicker)) {
            throw new Error("Revision info is required to show a link to the source or raw file, or a revision picker.");
        }

        this.initToolbarItems(headRef, fileChange);

        return this.initForContent(headRef, fileChange, optLineNumber);
    };

    FileContent.prototype.reset = function() {
        if (this._lastInitPromise) { // if init has previously been called, abort it
            this._lastInitPromise.abort();
        }
        var resetInternal = this._resetInternal.bind(this);
        // normal .then() is used here because we want to enforce that reset is called after the initPromise and that abort doesn't
        // stop after the init but before the reset.
        return promise.thenAbortable(this._lastInitPromise.then(resetInternal, resetInternal));

    };

    FileContent.prototype._resetInternal = function resetInternal() {
        if (this.extraClasses) {
            this.$self.removeClass(this.extraClasses);
        }
        if (_.isFunction(this.destroyView)) {
            this.destroyView();
        }
        this.destroyView = null; // only destroy it once
        this.extraClasses = null;

        return $.Deferred().resolve();
    };

    FileContent.prototype.destroy = function() {
        this.reset();
    };

    return FileContent;
});
