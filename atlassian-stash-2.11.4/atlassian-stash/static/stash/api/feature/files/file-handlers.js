/** @namespace stash/api/feature/files/file-handlers */
define('stash/api/feature/files/file-handlers', [
    'util/handler-registry'
],
/**
 * Provides a way to register file-handlers to handle rendering the source of a file or the diff of file changed.
 * For example, a {@linkCode FileHandler} can be registered to handle .stl files and render them as 3D files.
 * JS files registering file-handlers should use the resource context 'stash.feature.files.fileHandlers'.
 *
 * @example
 * var MyView = function(options) {
 *     var $element = $('&lt;div/&gt;');
 *     $container.append($element);
 *
 *     return {
 *         destroy: function() {
 *             $element.remove();
 *         },
 *         extraClasses: 'my-class something-else'
 *     }
 * }
 *
 * var myHandler = {
 *     weight: 400,
 *     handle: function(options) {
 *         if (options.extension === 'stl') {
 *             return new MyView(options);
 *         }
 *     }
 * }
 *
 * require('feature/file-content/file-handlers').register(myHandler);
 *
 * @exports stash/api/feature/files/file-handlers
 */
function(
    HandlerRegistry
) {

    'use strict';

    /**
     * Describes a project in Stash
     * @typedef {Object} ProjectJSON
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {number}       id - An identifier for the project.
     * @property {string}       name - Name of the project.
     * @property {string}       key - The key of the project.
     * @property {boolean}      public - True if the project is publicly accessible.
     * @property {boolean}      isPersonal - True if the project is a user's personal project.
     * @property {string}       avatarUrl - A URL to the project's avatar.
     */

    /**
     * Describes a repository in Stash
     * @memberOf stash/api/feature/files/file-handlers
     * @typedef {Object} RepositoryJSON
     *
     * @property {number}       id - An identifier for the repository.
     * @property {string}       name - Name of the repository.
     * @property {string}       slug - The slug of the repository which is a URL-friendly variant of its name.
     * @property {stash/api/feature/files/file-handlers.ProjectJSON}  project - The project the repository belongs to.
     * @property {string}       scmId - The identifier of the repository's SCM
     * @property {boolean}      public - True if the repository is publicly accessible.
     * @property {string}       cloneUrl - The repository's HTTP clone URL.
     */

    /**
     * @typedef {Object} RevisionJSON
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {string}       id - An identifier for the revision. For Git repositories, this is the SHA-1 hash.
     * @property {string}       displayId - An identifier for the revision suitable for displaying in the UI.
     */

    /**
     * Describes a range of commit
     * @typedef {Object} CommitsRangeJSON
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {stash/api/feature/files/file-handlers.RevisionJSON}     sinceRevision - First revision of the range of commits.
     * @property {stash/api/feature/files/file-handlers.RevisionJSON}     untilRevision - Last revision of the range of commits.
     */

    /**
     * Metadata about a change to a file
     * @typedef {Object}    FileChangeJSON
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {stash/api/feature/files/file-handlers.RepositoryJSON}   repository - Repository containing the file that was changed.
     * @property {string}           extension - Extension of file.
     * @property {string}           type - The type of change that was applied e.g. "MODIFY", "COPY" etc..
     * @property {string}           path - The path to the changed content.
     * @property {string}           srcPath - The path at which the changed content originated..
     * @property {boolean}          executable - True if the file is executable.
     * @property {boolean}          srcExecutable - True if the original file was executable.
     * @property {stash/api/feature/files/file-handlers.CommitRangeJSON}  commitRange - The since revision and the until revision of the file change.
     * @property {string}           nodeType - This will always be "FILE".
     * @property {Object}           [diff] - The diff of the file change. The structure matches the structure for diffs
     *                                  retrieved via the REST API. This is only provided for handling diffs as
     *                                  activity items for a pull request. For other usages, diffs must be retrieve
     *                                  from the server.
     */

    /**
     * @typedef {Object}    FileHandleCallbackOptions
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {string}           contentMode - The mode of content. Is either 'source' or 'diff'.
     * @property {jQuery}           $container  - jQuery node to append rendered file content.
     * @property {stash/api/feature/files/file-handlers.FileChangeJSON}   fileChange - Describes the changed file.
     * @property {string}           commentMode - Mode of rendering comments. Is either 'none', 'read', 'reply-only' or 'create-new'.
     * @property {boolean}          isExcerpt - Used for indicating whether this is only an excerpt and not a full file/diff
     * @property {number}           targetLine - Line number of the anchored line.
     * @property {stash/api/feature/files/file-handlers.CommentJSON[]}    [lineComments] - An array of comments anchored to the lines of the file. The structure
     *                                      matches the structure for comments retrieved via the REST API. This is only provided
     *                                      for handling diffs as activity items for a pull request. For other usages, line comments
     *                                      will be retrieved from the server when retrieving diffs.
     */

    /**
     * Callback to handle file.
     * @callback FileHandleCallback
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @param {stash/api/feature/files/file-handlers.FileHandleCallbackOptions}   options - Options data provided to handle callback.
     * @return {Promise}        A promise object hopefully resolved with {@linkcode FileHandlerResult} or an error.
     */

    /**
     * @typedef {Object}    FileHandler
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {number}               [weight=1000] - Weight of handler determining the order it is tried.
     *                                                  The default weight of the source/diff view is 10000.
     * @property {stash/api/feature/files/file-handlers.FileHandleCallback}   handle        - Function called to handle file.
     */

    /**
     * @typedef {Object}    FileHandlerResult
     * @memberOf stash/api/feature/files/file-handlers
     *
     * @property {Function} destroy        - A function that will be called before the current view is destroyed, which may happen on state change.
     *                                       This is a chance to destory/cleanup any events or remove DOM elements.
     * @property {string}   [extraClasses] - Additional style class applied to parent file-content. Can be used to apply background color.
     */

    // At the moment file-handlers is just a single, global HandlerRegistry
    return new HandlerRegistry();

});
