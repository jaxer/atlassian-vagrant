define('feature/file-content/request-diff', [
    'jquery',
    'util/ajax',
    'util/navbuilder',
    'feature/file-content/diff-view-options'
], function (
    $,
    ajax,
    navbuilder,
    diffViewOptions
) {

    // See notes on requestDiff. We cache to avoid multiple server requests for the same information by different handlers.
    var cache = {};
    var DEFAULT_CONTEXT_LINES = -1; // a negative value will set the context lines to the system default

    // Data is returned as an array due to the REST resource supporting multiple diffs
    // The first will not necessarily be the one we want. We want the first with the destination
    // set to the selected file. This avoids choosing the wrong diff where a file has been modified
    // and copied in the same changeset, for example.
    function getMatchingDiff(fileChange, data) {
        if ($.isArray(data.diffs) && data.diffs.length) {
            data = _.find(data.diffs, function(diff) {
                if (diff.destination) {
                    return diff.destination.toString === fileChange.getPath().toString();
                } else if (fileChange.getSrcPath()) {
                    return diff.source.toString === fileChange.getSrcPath().toString();
                }
                return false;
            }) || data.diffs[0]; //Or the first diff if none were found (this shouldn't happen)
        }
        return data;
    }

    /**
     * Request diff information from the server. Requests are cached for the remainder of an event loop after they are resolved.
     * This helps with performance of multiple handlers requesting the same data.
     *
     * @param {FileChange} fileChange a fileChange model describing the change
     * @param {Object} options additional options
     * @returns {Promise} a promise that resolves to the diff JSON returned form the server.
     */
    function requestDiff(fileChange, options) {
        if (fileChange.getDiff()) {
            return $.Deferred().resolve($.extend({
                lineComments: options.lineComments || [],
                fileComments: options.fileComments || []
            }, fileChange.getDiff()));
        }

        options = options || {};
        var ignoreWhitespace = options.hasOwnProperty('ignoreWhitespace') ?
                                   options.ignoreWhitespace :
                                   diffViewOptions.get('ignoreWhitespace');

        var contextLines = isNaN(Number(options.contextLines)) ? DEFAULT_CONTEXT_LINES : Math.floor(options.contextLines);

        var pullRequest = fileChange.getCommitRange().getPullRequest();
        var diffBuilder = navbuilder.rest()
            .project(fileChange.getRepository().getProject().getKey())
            .repo(fileChange.getRepository().getSlug());

        diffBuilder = pullRequest ? diffBuilder.pullRequest(pullRequest.getId()) : diffBuilder.changeset(fileChange.getCommitRange());
        var url = diffBuilder.diff(fileChange)
            .withParams({
                avatarSize: stash.widget.avatarSizeInPx({ size: options.avatarSize || 'medium' }),
                markup: true,
                whitespace: ignoreWhitespace ? 'ignore-all' : '',
                contextLines: contextLines,
                withComments: options.withComments
            })
            .build();

        if (cache.hasOwnProperty(url) && cache[url].state() !== 'rejected') {
            return cache[url];
        }

        var xhr = ajax.rest({
            url: url,
            statusCode : options.statusCode || ajax.ignore404WithinRepository()
        });

        var piped = xhr.then(function(data) {
            if (data.errors && data.errors.length) {
                return $.Deferred().rejectWith(this, [this, null, null, data]);
            } else {
                data = getMatchingDiff(fileChange, data);
            }
            setTimeout(function() {
                delete cache[url];
            });
            return data;
        });

        cache[url] = piped.promise(xhr);
        return cache[url];
    }

    return requestDiff;
});
