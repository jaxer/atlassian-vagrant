define('feature/file-content/binary-view', [
    'jquery',
    'underscore',
    'util/deprecation',
    'util/events',
    'util/navbuilder',
    'exports'
], function(
    $,
    _,
    deprecate,
    events,
    navbuilder,
    exports
) {

    /**
     * Returns the ?raw URL for a file at a revision
     * @param {Object} path
     * @param {Revision} revision
     * @returns {string}
     */
    function getRawUrl(path, revision) {
        return navbuilder
            .currentRepo()
            .browse()
            .path(path.components)
            .at(revision)
            .raw()
            .build();
    }

    /**
     * Return the binaryHtml result for generic binary files.
     * @param {string} url raw url of the file
     * @returns {{$elem: (jQuery|HTMLElement), type: string}}
     */
    function handleBinary(url) {
        return {
            $elem : $(stash.feature.fileContent.binaryView.unrenderable({ rawUrl : url })),
            type : 'link'
        };
    }

    /**
     * Return the binaryHtml result for image files.
     * @param {string} url raw url of the file
     * @returns {{$elem: (jQuery|HTMLElement), type: string}}
     */
    function handleImage(url) {
        var $elem = $("<img />");
        $elem.attr('src', url);
        return {
            $elem : $elem,
            type : 'image'
        };
    }

    /**
     * Map of file extension to HTML-returning function.
     */
    var handlerByExtension = {
        png: handleImage,
        jpg: handleImage,
        jpeg: handleImage,
        bmp: handleImage,
        ico: handleImage,
        gif: handleImage,
        svg: handleImage
    };

    /**
     * Calls the appropriate handler for the file's extension and returns the result.
     * @param {Object} path to the binary file
     * @param {Revision} revision at which to display the file.
     * @returns {{$elem: (jQuery|HTMLElement), type: string}}
     */
    function getBinaryHtml(path, revision) {
        var extension = path.extension && path.extension.toLowerCase();
        var url = getRawUrl(path, revision),
            handler = handlerByExtension[extension] || handleBinary;
        return handler(url);
    }

    /**
     * @deprecated since 2.10 for removal in 3.0. This will be replaced by a BinarySourceView for displaying binary source.
     *
     * Render a source representation for the binary file
     *
     * @param {jQuery} $container where to place the rendered file
     * @param {Object} path an object representing the path to the file
     * @param {CommitRange} commitRange an object that represents the commit at which to display the source. It must only contain an 'until' revision.
     * @returns {jQuery} the passed in $container
     */
    function renderBinaryFile($container, path, commitRange) {
        var untilRevision = commitRange.getUntilRevision();

        var result = getBinaryHtml(path, untilRevision && untilRevision.getId());
        $container.empty()
            .addClass('binary')
            .append(result.$elem);
        events.trigger('stash.feature.sourceview.onBinary', null, {
            path: path,
            type: result.type,
            revision: untilRevision
        });
        return $container;
    }

    /**
     * @deprecated since 2.10 for removal in 3.0. Use BinaryDiffView for displaying binary diffs.
     *
     * Render a diff representation for the binary file between two revisions
     *
     * @param {jQuery} $container where to place the rendered diff
     * @param {Object} source an object representing the path to the file at the since/source/old revisionv
     * @param {Object} destination an object representing the path to the file at the until/destination/new revision
     * @param {CommitRange} commitRange an object that represents the two commits between whch to diff the file.
     */
    function renderBinaryDiff($container, source, destination, commitRange) {
        var result, sourceType, destinationType,
            untilRevision = commitRange.getUntilRevision(),
            sinceRevision = commitRange.getSinceRevision();

        // add a new toolbar to the diff view, which will be populated with the mode buttons later on.
        $(aui.toolbar2.toolbar2({content: '', extraClasses: 'image-diff-toolbar'})).prependTo($container);

        if (source && sinceRevision) {
            result = getBinaryHtml(source, sinceRevision.getId());
            sourceType = result.type;
            $("<div class='since-revision'>")
                .addClass('binary')
                .append($("<h5>").text(stash_i18n('stash.web.diff.since.revision', 'Old')))
                .append(result.$elem)
                .appendTo($container);
        }
        if (destination && untilRevision) {
            result = getBinaryHtml(destination, untilRevision.getId());
            destinationType = result.type;
            $("<div class='until-revision'>")
                .addClass('binary')
                .append($("<h5>").text(stash_i18n('stash.web.diff.until.revision', 'New')))
                .append(result.$elem)
                .appendTo($container);
        }
        events.trigger('stash.feature.diffview.onBinary', this, {
            $container : $container,
            sourcePath : source,
            sourceType : sourceType,
            sinceRevision : sinceRevision,
            destinationPath : destination,
            destinationType : destinationType,
            untilRevision: untilRevision
        });
    }

    // Text files which should be handled as binary
    var binaryExtensions = [
        'svg'
    ];

    /**
     * Whether the diff response should be treated as binary. The REST response doesn't account for text-based files that
     * are best displayed as binary, such as SVG images.

     * @param {Object} diff JSON representing a single diff, as found within the Stash /diff REST resource (as a single item in the returned array).
     * @returns {boolean}
     */
    function shouldRenderBinary(diff) {
        // NB this doesn't actually work for source-view because the data returned is orthogonal to these checks
        // method exists as a single point to refactor/fix later.
        var extension = diff.destination && diff.destination.extension;
        return !!(diff && (diff.binary || extension && (_.indexOf(binaryExtensions, extension) >= 0)));
    }

    exports.renderBinaryFile = deprecate.fn(renderBinaryFile, 'feature/file-content/binary-view::renderBinaryFile', 'feature/file-content/binary-source-view', '2.10', '3.0');
    exports.renderBinaryDiff = deprecate.fn(renderBinaryDiff, 'feature/file-content/binary-view::renderBinaryDiff', 'feature/file-content/binary-diff-view', '2.10', '3.0');
    exports.shouldRenderBinary = shouldRenderBinary;
    exports.getRenderedBinary = getBinaryHtml;
});
