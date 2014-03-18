define('feature/changeset/difftree',
    ['exports', 'jquery', 'aui', 'util/events', 'model/content-tree-node-types', 'util/navbuilder', 'util/ajax'],
    function(exports, $, AJS, events, ContentNodeType, navbuilder, ajax) {

        var pathSeparator = '/';
        var DEFAULT_CHANGESET_LIMIT = 1000;
        var defaultMaximumOpen = ($.browser.msie && parseInt($.browser.version, 10) < 9) ? 20 : 200;

        function openTree(tree, maximumOpen) {
            maximumOpen = maximumOpen >= 0 ? maximumOpen : defaultMaximumOpen;
            var opened = 0;
            function openNodes(node) {
                if (node.metadata.isDirectory) {
                    node.state = 'open';
                    node.data.icon = 'aui-icon aui-icon-small aui-iconfont-devtools-folder-open';

                    for (var i = 0, l = node.children.length, child; i < l && opened < maximumOpen; i++) {
                        child = node.children[i];
                        openNodes(child);
                    }
                } else if (node.metadata.isFile) {
                    opened++;
                }
            }
            openNodes(tree);
        }

        function compareTreeNodes(a, b) {
            return a.children ?
                (b.children ? (a.data.title.toLowerCase() < b.data.title.toLowerCase() ? -1 : 1) : -1) :
                (!b.children ? (a.data.title.toLowerCase() < b.data.title.toLowerCase() ? -1 : 1) : 1);
        }

        function flattenTree(tree) {
            tree.childrenByTypeAndComponent = undefined;
            for (var i = 0, l = tree.children.length, child, components; i < l; i++) {
                child = tree.children[i];
                if (child.metadata.isDirectory) {
                    components = [child.data.title];
                    while (child.children.length === 1 && child.children[0].metadata.isDirectory) {
                        child = child.children[0];
                        components.push(child.data.title);
                    }
                    child.data.title = components.join(pathSeparator);
                    tree.children[i] = child;
                    flattenTree(child);
                }
            }
            tree.children.sort(compareTreeNodes);
        }

        function computeTree(changes, maximumOpen) {


            var tree = {
                data : {
                    icon : "aui-icon aui-icon-small aui-iconfont-devtools-folder-closed"
                },
                state : 'closed',
                metadata : {
                    isDirectory : true
                },
                children : [],
                childrenByTypeAndComponent : {}
            };
            for (var i = 0, l = changes.length, change, subTree; i < l; i++) {
                change = changes[i];
                subTree = tree;
                for (var j = 0, k = change.path.components.length, component, key, child; j < k; j++) {
                    component = change.path.components[j];
                    key = (j + 1 === k ? 'F' : 'D') + component;
                    if (Object.prototype.hasOwnProperty.call(subTree.childrenByTypeAndComponent, key)) {
                        subTree = subTree.childrenByTypeAndComponent[key];
                    } else {
                        var isLastPathComponent = j + 1 === k;
                        if (isLastPathComponent) {
                            var hasComments = !!(change.attributes &&
                                                 change.attributes.activeComments &&
                                                 parseInt(change.attributes.activeComments[0], 10));
                            child = {
                                data : {
                                    title : component,
                                    icon : "aui-icon aui-icon-small " + (change.nodeType === ContentNodeType.SUBMODULE ? 'aui-iconfont-devtools-submodule' : hasComments ? "aui-iconfont-devtools-file-commented" : "aui-iconfont-devtools-file"),
                                    attr : {
                                        id : 'change' + i,
                                        "class": "change-type-" + change.type + (change.conflict ? " conflict" : ""),
                                        href : "#" + change.path.toString,
                                        title: change.conflict ? stash_i18n("stash.web.pullrequest.tree.conflicted.file", "Merge conflict") :
                                                            hasComments ? stash_i18n("stash.web.pullrequest.tree.commented.file", "This file has comments") : undefined
                                    }
                                },
                                metadata : {
                                    isFile : true,
                                    changeType : change.type,
                                    nodeType : change.nodeType,
                                    path : change.path,
                                    srcPath : change.srcPath,
                                    conflict: change.conflict,
                                    contentId: change.contentId,
                                    executable: change.executable,
                                    srcExecutable: change.srcExecutable
                                }
                            };
                        } else {
                            child = {
                                data : {
                                    title : component,
                                    icon : "aui-icon aui-icon-small aui-iconfont-devtools-folder-closed"
                                },
                                state : 'closed',
                                metadata : {
                                    isDirectory : true
                                },
                                children : [],
                                childrenByTypeAndComponent : {}
                            };
                        }
                        subTree.children.push(child);
                        subTree = subTree.childrenByTypeAndComponent[key] = child;
                    }
                }
            }
            flattenTree(tree);
            openTree(tree, maximumOpen);
            return tree;
        }

        function DiffTree(wrapperSelector, commitRange, options) {
            options = options || {};

            this._fileLimit = options.maxChanges || DEFAULT_CHANGESET_LIMIT;
            this._$wrapper = $(wrapperSelector);
            this._commitRange = commitRange;
            this._hasOtherParents = !!options.hasOtherParents;
        }

        DiffTree.prototype.init = function(selectedPathComponents) {

            this._initiallySelectedPathComponents = selectedPathComponents;
            this._firstCommentAddedHandler = _.bind(this._firstCommentAddedHandler, this);
            this._lastCommentDeletedHandler =_.bind(this._lastCommentDeletedHandler, this);

            events.on('stash.feature.comments.firstCommentAdded', this._firstCommentAddedHandler);
            events.on('stash.feature.comments.lastCommentDeleted', this._lastCommentDeletedHandler);

            if (!this.data) {
                return this.requestData();
            } else {
                return this.dataReceived();
            }
        };

        DiffTree.prototype._firstCommentAddedHandler = function() {
            var $icon = this.getSelectedFile().find('a > ins');
            $icon.hide()
                .removeClass('aui-iconfont-devtools-file').addClass('aui-iconfont-devtools-file-commented')
                .fadeIn('slow');
        };

        DiffTree.prototype._lastCommentDeletedHandler  = function() {
            var $icon = this.getSelectedFile().find('a > ins');
            $icon.hide()
                .removeClass('aui-iconfont-devtools-file-commented').addClass('aui-iconfont-devtools-file')
                .fadeIn('slow');
        };

        DiffTree.prototype.reset = function () {
            if (this._request) {
                this._request.abort();
                this._request = null;
                this._interrupted = true;
            }
            if (this._rendering) {
                this._rendering = false;
                this._interrupted = true;
            }
            events.off('stash.feature.comments.firstCommentAdded', this._firstCommentAddedHandler);
            events.off('stash.feature.comments.lastCommentDeleted', this._lastCommentDeletedHandler);
        };

        DiffTree.prototype.requestData = function() {
            var self = this;

            if (this._request) {
                this._request.abort();
                this._request = null;
            }
            this._request = ajax.rest({
                url : navbuilder.rest()
                    .currentRepo()
                    .changes(self._commitRange)
                    .withParams({ start : 0, limit : this._fileLimit })
                    .build()
            });
            return this._request.always(function() {
                self._request = null;
            }).then(function(data) {
                if (!data) {
                    var msg = AJS.escapeHtml(stash_i18n("stash.web.pullrequest.tree.nodata", "This pull request returned no data to display"));
                    self.prependMessage(msg, "error");
                    return $.Deferred().reject();
                } else {
                    self._rendering = true;
                    self._interrupted = false;

                    self.isTruncated = !data.isLastPage;
                    self.data = computeTree(data.values);
                    return self.dataReceived().done(function() {
                        self._rendering = false;
                    });
                }
            });
        };

        function startsWith(str, substring) {
            return str.substring(0, substring.length) === substring;
        }

        /**
         * This function will return the file node whose path matches your preferredPathComponents if it can.
         * If it can't, it'll instead return the first file node in the tree.
         * If there are no file nodes, it'll return null;
         *
         * It's used for selecting an initial node in the file tree when the tree is being initialized.
         *
         * @param data a flattened tree (usually the diffTree.data object)
         * @param preferredPathComponents the path components of the file to attempt to select - array of strings.
         */
        function getNodeToSelect(data, preferredPathComponents) {
            return getPreferredNode(data, preferredPathComponents) || getFirstNode(data);
        }

        /**
         * @returns the file node which matches the preferredPathComponents, or null if none match
         */
        function getPreferredNode(preferred, preferredComponents) {
            if (!preferredComponents) {
                return null;
            }
            preferredComponents = preferredComponents.slice(0);

            while (preferred && preferred.children) {
                var componentToMatch = preferredComponents.shift(),
                    isLastComponent = !preferredComponents.length;

                var i = preferred.children.length;
                while (i--) {
                    var childToCheck = preferred.children[i],
                        title = childToCheck.data.title;

                    if (componentToMatch === title && isLastComponent === Boolean(childToCheck.metadata.isFile)) { //matches exactly, go inside.
                        preferred = childToCheck;
                        break;
                    }

                    // this is a collapsed node that at least partially matches, keep pulling off components
                    if (!isLastComponent && startsWith(title, componentToMatch + pathSeparator)) {

                        while (preferredComponents.length > 1 &&
                            startsWith(title, componentToMatch + pathSeparator + preferredComponents[0])) {
                            componentToMatch += pathSeparator;
                            componentToMatch += preferredComponents.shift();
                        }

                        if (title !== componentToMatch) { // they passed in a bad path, we're not going to find it.
                            //this handles:
                            // - preferredPath too short
                            // - preferredPath partially matches a collapsed node
                            return null;
                        }
                        //else collapsed node was fully matched.
                        preferred = childToCheck;
                        break;
                    }

                    //this child doesn't match
                }

                if (i < 0) { // no child matched
                    return null;
                }
            }

            return preferred && preferred.metadata && preferred.metadata.isFile ?
                preferred : null;
        }

        function getFirstNode(first) {
            while (first && first.children) {
                first = first.children[0];
            }
            return first && first.metadata && first.metadata.isFile ? first : null;
        }

        function getPathFromRoot(tree, toNode) {

            if (tree === toNode) {
                return [ toNode ];
            }

            var i = tree.children ? tree.children.length : 0;
            while(i--) {
                var childResult = getPathFromRoot(tree.children[i], toNode);
                if (childResult) {
                    childResult.unshift(tree);
                    return childResult;
                }
            }

            return null;
        }

        DiffTree.prototype.prependMessage = function (contents, type) {
            this._$wrapper.find(".aui-message").remove();

            type = type || "warning";

            this._$wrapper.prepend(widget.aui.message[type]({
                extraClasses : 'diff-tree-scm-message',
                contents : contents
            }));
        };

        DiffTree.prototype.dataReceived = function() {
            var self = this;

            var deferred = $.Deferred();
            function resolveIfNotInterrupted() {
                if (!self._interrupted) {
                    deferred.resolve(self);
                } else {
                    deferred.reject(self);
                }
            }

            var initiallySelectedNode = getNodeToSelect(this.data, this._initiallySelectedPathComponents);
            var initiallySelectedIdArray;

            if (initiallySelectedNode) {
                initiallySelectedIdArray = [ initiallySelectedNode.data.attr.id ];

                // open the ancestors of the selected node.
                var toOpen = getPathFromRoot(this.data, initiallySelectedNode) || [];

                toOpen.pop(); // don't open the file, just the folders above it. Otherwise the file gets a twixie.

                while(toOpen.length) {
                    toOpen.pop().state = 'open';
                }

            } else {
                initiallySelectedIdArray = [ ];
            }

            var initializingTree = true;

            var $currentlySelectedNode;

            this._$wrapper.find(".aui-message").remove();
            if (this.isTruncated) {
                var contents = "";

                if (this._commitRange.getPullRequest()){
                    //TODO - Better message for pull request changesets that are too large to render.
                    contents = AJS.escapeHtml(stash_i18n("stash.web.pullrequest.tree.truncated", "This pull request is too large to render. Showing the first {0} files.", this._fileLimit));
                } else {
                    var gitCommand,
                        atRevision = this._commitRange.getUntilRevision(),
                        parentRevision = this._commitRange.getSinceRevision();

                    if (parentRevision) {
                        gitCommand = 'git diff-tree -C -r ' + parentRevision.getId() + ' ' + atRevision.getId();
                    } else {
                        gitCommand = 'git diff-tree -r --root ' + atRevision.getId();
                    }

                    contents = AJS.escapeHtml(stash_i18n("stash.web.changeset.tree.truncated", "This changeset is too large to render. Showing the first {0} files. You can still retrieve it manually with the following Git command.", this._fileLimit)) +
                        '<p class="scm-command">' + AJS.escapeHtml(gitCommand) + '</p>';
                }

                this.prependMessage(contents, "warning");
            }
            if (this.data.children.length) {
                this.$tree = this._$wrapper.children(".file-tree");
                this.$tree.fadeOut('fast', function () {
                        self.$tree.empty()
                            .off('.jstree')
                            .jstree("destroy")
                            .on('loaded.jstree', function() {
                                //allow jstree plugins to finish loading (namely ui).
                                setTimeout(function() {
                                    initializingTree = false;
                                    resolveIfNotInterrupted();
                                }, 0);
                            }).jstree({
                                json_data : {
                                    data : self.data.children,
                                    progressive_render : true
                                },
                                core : {
                                    animation : 200
                                },
                                ui : {
                                    select_limit : 1,
                                    selected_parent_close: false,
                                    initially_select : initiallySelectedIdArray /* use this for deeplinking */
                                },
                                plugins : ["json_data", "ui"]
                            }).on('before.jstree', function(e, data) {
                                if (data.func === 'select_node') {
                                    var $node = $(data.args[0]).parent();

                                    if ($node.data('isFile') && (!$currentlySelectedNode || $currentlySelectedNode[0] !== $node[0])) {
                                        $currentlySelectedNode = $node;
                                        events.trigger('stash.feature.changeset.difftree.selectedNodeChanged', self, $node, initializingTree);
                                    } else if ($node.data('isDirectory')) {
                                        self.$tree.jstree("toggle_node", $node);
                                        return false; //e.preventDefault() doesn't work...
                                    } // else { ignore everything else }
                                }
                            }).on('open_node.jstree', function(e, data){
                                var $openedNode = data.args[0];
                                var $nodeIcon = $openedNode.children('a').children('ins');
                                $nodeIcon.removeClass('aui-iconfont-devtools-folder-closed');
                                $nodeIcon.addClass('aui-iconfont-devtools-folder-open');
                                events.trigger('stash.feature.changeset.difftree.nodeOpening', self, $openedNode);
                            }).on('after_open.jstree', function(e, data){
                                var $openedNode = data.args[0];
                                events.trigger('stash.feature.changeset.difftree.nodeOpened', self, $openedNode);
                            }).on('close_node.jstree', function(e, data){
                                var $closedNode = data.args[0];
                                var $nodeIcon = $closedNode.children('a').children('ins');
                                $nodeIcon.removeClass('aui-iconfont-devtools-folder-open');
                                $nodeIcon.addClass('aui-iconfont-devtools-folder-closed');
                                events.trigger('stash.feature.changeset.difftree.nodeClosing', self, $closedNode);
                            }).on('after_close.jstree', function(e, data){
                                var $closedNode = data.args[0];
                                events.trigger('stash.feature.changeset.difftree.nodeClosed', self, $closedNode);
                            }).on('loaded.jstree', function(e, data){
                                events.trigger('stash.feature.changeset.difftree.treeInitialised', self, self);
                            }).fadeIn('fast');
                    });
            } else {
                this.$tree = undefined;
                var $fileTree = this._$wrapper.children(".file-tree");
                $fileTree.fadeOut('fast', function () {
                    $fileTree.empty().off('.jstree').jstree("destroy");
                    var message = AJS.escapeHtml(
                        self._hasOtherParents ?
                            stash_i18n("stash.web.changeset.merge.tree.empty", "There are no changes to this parent. Use the selector above to switch the parent.") :
                            stash_i18n("stash.web.changeset.tree.empty", "There are no changes.")
                    );
                    self.prependMessage(message, "info");
                    setTimeout(resolveIfNotInterrupted, 0);
                });
            }
            return deferred.promise();
        };

        DiffTree.prototype.getSelectedFile = function() {
            var $tree = this.$tree;
            return $tree ? $tree.jstree('get_selected') : null;
        };

        DiffTree.prototype.selectFile = function(pathComponents) {
            if (!this.$tree) {
                return;
            }
            var nodeToSelect = getNodeToSelect(this.data, pathComponents),
                currentlySelectedFile = this.getSelectedFile(),
                currentlySelectedPath = currentlySelectedFile && currentlySelectedFile.data('path'),
                currentlySelectedNode = currentlySelectedPath && getNodeToSelect(this.data, currentlySelectedPath.components);

            if (nodeToSelect && nodeToSelect !== currentlySelectedNode) {
                this.$tree.jstree('deselect_all').jstree('select_node', '#' + nodeToSelect.data.attr.id);
            }
        };

        DiffTree.prototype.openNextFile = function() {
            if (this.$tree) {
                var jstree = $.jstree._reference(this.$tree),
                    $currentNode = this.getSelectedFile(),
                    $nextFile = findFile(jstree, jstree._get_next, jstree._get_next($currentNode));

                if ($nextFile && $nextFile.length) {
                    $nextFile.find('a').focus().click();
                }
            }
        };

        DiffTree.prototype.openPrevFile = function() {
            if (this.$tree) {
                var jstree = $.jstree._reference(this.$tree),
                    $currentNode = this.getSelectedFile(),
                    $prevFile = findPrevFileOrClosedDir(jstree, jstree._get_prev($currentNode));

                if ($prevFile && $prevFile.length) {
                    $prevFile.find('a').focus().click();
                }
            }
        };

        /* Find leaf based on the getAdjacentNode function passed in */
        function findFile(jstree, getAdjacentNode, $node) {
            if ($node && $node.length && !$node.hasClass('jstree-leaf')) {
                jstree.open_node($node);
                $node = findFile(jstree, getAdjacentNode, getAdjacentNode.call(jstree, $node));
            }

            return $node;
        }

        /* Traverse up til you find a leaf OR closed directory then find its last leaf */
        function findPrevFileOrClosedDir(jstree, $node) {
            if ($node && !$node.hasClass('jstree-leaf')) {
                if ($node.hasClass('jstree-closed')) {
                    jstree.open_node($node);
                    $node = findFile(jstree, getLastChild, getLastChild.call(jstree, $node));
                } else if ($node.length) {
                    $node = findPrevFileOrClosedDir(jstree, jstree._get_prev($node));
                }
            }

            return $node;
        }

        function getLastChild($node) {
            return this._get_children($node).filter('.jstree-last');
        }

        exports.DiffTree = DiffTree;
        exports.computeTree = computeTree;
        exports.flattenTree = flattenTree;
        exports.compareTreeNodes = compareTreeNodes;
        exports.getNodeToSelect = getNodeToSelect;
        exports.getPathFromRoot = getPathFromRoot;
    });
