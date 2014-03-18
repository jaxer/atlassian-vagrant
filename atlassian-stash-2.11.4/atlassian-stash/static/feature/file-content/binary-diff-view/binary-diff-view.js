define('feature/file-content/binary-diff-view', [
    'jquery',
    'util/deprecation',
    'util/events',
    'model/file-change',
    'feature/file-content/binary-view',
    'feature/file-content/image-diff-toolbar',
    'feature/file-content/image-differ'
], function(
    $,
    deprecate,
    events,
    FileChange,
    binaryView,
    ImageDiffToolbar,
    ImageDiffer
) {

    'use strict';

    /**
     * Display a diff between two binary files at different revisions in this repository.
     *
     * @param {Object} diff JSON representing a single diff, as found within the Stash /diff REST resource (as a single item in the returned array).
     * @param {Object} options An object representing options, as provided by the FileHandlers API.
     * @param {FileChange} options.fileChange The FileChange to represent in this view.
     * @param {jQuery} options.$container Where to place this BinaryDiffView.
     * @constructor BinaryDiffView
     */
    function BinaryDiffView(diff, options) {
        this._init(diff, options);
    }

    /**
     * Adds binary displays to the provided $container. If the binary files are both images, adds image-diffing controls
     * into the $container as well.
     * @param {Object} diff see constructor
     * @param {Object} options see constructor
     * @private
     */
    BinaryDiffView.prototype._init = function(diff, options) {
        var commitRange = new FileChange(options.fileChange).getCommitRange();
        var untilRevision = commitRange.getUntilRevision();
        var sinceRevision = commitRange.getSinceRevision();

        this._$container = $(stash.feature.fileContent.binaryView.container()).appendTo(options.$container);

        this._populateBinaryInfo(diff, sinceRevision, untilRevision);
        this._renderBinaryDiff();

        events.trigger('stash.feature.fileContent.onBinaryDiffShown', null, {
            containerEl : this._$container.get(0),
            sourcePath : diff.source,
            sourceType : this._sinceResult && this._sinceResult.type,
            sinceRevision : sinceRevision && sinceRevision.toJSON(),
            destinationPath : diff.destination,
            destinationType : this._untilResult && this._untilResult.type,
            untilRevision: untilRevision && untilRevision.toJSON()
        });
        deprecate.triggerDeprecated('stash.feature.diffview.onBinary', this, {
            $container : this._$container,
            sourcePath : diff.source,
            sourceType : this._sinceResult && this._sinceResult.type,
            sinceRevision : sinceRevision,
            destinationPath : diff.destination,
            destinationType : this._untilResult && this._untilResult.type,
            untilRevision: untilRevision
        }, 'stash.feature.fileContent.diff.onShow', '2.11', '3.0');
    };

    /**
     * Determine information about the file at the two revisions - namely how it will be displayed and obtain an HTML representation of it.
     * @param {Object} diff see constructor
     * @param {Revision} sinceRevision the since/from/old revision for the change
     * @param {Revision} untilRevision the until/to/new revision for the change
     * @private
     */
    BinaryDiffView.prototype._populateBinaryInfo = function(diff, sinceRevision, untilRevision) {
        var sourcePath = diff.source;
        var destinationPath = diff.destination;

        if (sourcePath && sinceRevision) {
            this._sinceResult = binaryView.getRenderedBinary(sourcePath, sinceRevision.getId());
        }
        if (destinationPath && untilRevision) {
            this._untilResult = binaryView.getRenderedBinary(destinationPath, untilRevision.getId());
        }
    };

    /**
     * Render the binary diff into the DOM, along with image-diffing controls if the two versions of the file are both images.
     * @private
     */
    BinaryDiffView.prototype._renderBinaryDiff = function () {

        var diffingImages = this._sinceResult && this._untilResult &&
                            this._sinceResult.type === this._untilResult.type && this._sinceResult.type === 'image';

        if (diffingImages) {
            this._toolbar = new ImageDiffToolbar(this._$container);
            this._differ = new ImageDiffer(this._$container);
        }

        if (this._sinceResult) {
            $(stash.feature.fileContent.binaryView.cell({
                extraClasses : 'since-revision',
                titleText : stash_i18n('stash.web.diff.since.revision', 'Old')
            })).append(this._sinceResult.$elem)
            .appendTo(this._$container);
        }

        if (this._untilResult) {
            $(stash.feature.fileContent.binaryView.cell({
                extraClasses : 'until-revision',
                titleText : stash_i18n('stash.web.diff.until.revision', 'New')
            })).append(this._untilResult.$elem)
            .appendTo(this._$container);
        }

        if (diffingImages) {
            var self = this;
            this._differ.init().done(function(enableExtraModes) {
                self._toolbar.init(enableExtraModes);
            });
            this._toolbar.on('modeChanged', function(newMode) {
                self._differ.setMode(newMode);
            });
        }
    };

    /**
     * Destroy this instance. Cannot be used again once destroyed.
     */
    BinaryDiffView.prototype.destroy = function() {
        if (this._toolbar) {
            this._toolbar.destroy();
            this._toolbar = null;
        }
        if (this._differ) {
            this._differ.destroy();
            this._differ = null;
        }
        if (this._$container) {
            this._$container.remove();
            this._$container = null;
        }

        this._sinceResult = null;
        this._untilResult = null;
    };

    return BinaryDiffView;

});
