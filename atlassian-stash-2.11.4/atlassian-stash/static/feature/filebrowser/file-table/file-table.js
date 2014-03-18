define('feature/filebrowser/file-table', [
    'jquery',
    'underscore',
    'memoir',
    'util/events',
    'util/ajax',
    'util/dom-event',
    'util/navbuilder',
    'model/page-state',
    'model/path',
    'model/revision-reference',
    'exports'
], function (
    $,
    _,
    memoir,
    events,
    ajax,
    domEventUtil,
    nav,
    pageState,
    Path,
    RevisionReference,
    exports
) {

    function getParentURL(projectKey, repoSlug, path, revisionRef) {
        var parent = path && path.getParent();
        if (parent) {
            return buildUrl(projectKey, repoSlug, parent, revisionRef);
        }
        return '';
    }

    /* If we came from a previous child directory or file, we want to initially select it */
    function getPrevChildDirOrFileName() {
        var prevUrl,
            currentUrl = window.location.href,
            state = memoir.state();

        if (state && state.prevUrl) {
            prevUrl = state.prevUrl;
        } else {
            prevUrl = document.referrer;
        }

        return getChildPathDifferenceBetweenUrls(prevUrl, currentUrl);
    }

    /*
     * Find the difference between 2 urls, one assumed to be the child of the other.
     * Allow for differences in view operation (browse, diff, etc)
      */
    function getChildPathDifferenceBetweenUrls(prevUrl, currentUrl) {
        var prevDirOrFileName,
            baseUrl,
            baseRegex;

        // make sure we have 2 non-empty strings for urls.
        if (!(prevUrl && currentUrl) || (typeof prevUrl !== 'string') || (typeof currentUrl !== 'string')) {
            return null;
        }

        // remove querystring from urls
        prevUrl = prevUrl.split('?')[0];
        currentUrl = currentUrl.split('?')[0];

        // if the previous url is shorter than the current url, it is not a child of currentUrl, so bail out.
        if (prevUrl.length < currentUrl.length) {
            return null;
        }

        currentUrl = nav.appendSlashToUrl(currentUrl);

        baseUrl = nav.currentRepo().build();
        // base url, minus '/browse', plus regex for view operation (browse, diff, etc)
        baseRegex = new RegExp(baseUrl.substring(0, baseUrl.lastIndexOf('/')) + '/.*?/');

        //Normalise the urls to the `browse` operation
        currentUrl = nav.appendSlashToUrl(baseUrl) + currentUrl.split(baseRegex)[1];
        prevUrl =  nav.appendSlashToUrl(baseUrl) + prevUrl.split(baseRegex)[1];

        //split out the difference between the urls
        prevDirOrFileName = prevUrl.split(currentUrl)[1];

        //for paths containing multiple levels of directories, grab the topmost directory.
        if (prevDirOrFileName && prevDirOrFileName.indexOf('/') >= 0) {
            prevDirOrFileName = prevDirOrFileName.substring(0, prevDirOrFileName.indexOf('/'));
        }

        return prevDirOrFileName ? decodeURIComponent(prevDirOrFileName) : null;
    }

    function buildUrl(projectKey, repoSlug, path, revisionRef) {
        var navBuilder = nav.project(projectKey).repo(repoSlug).browse().path(path);
        if(revisionRef && !revisionRef.isDefault()) {
            return navBuilder.at(revisionRef.getId()).build();
        } else {
            return navBuilder.build();
        }
    }

    function updateWarnings(fileCount, isTruncated) {
        $(".filebrowser-banner").replaceWith(
            stash.feature.filebrowser.warnings({
                isTruncated: isTruncated,
                message: stash_i18n('stash.web.filebrowser.toomanyfiles', 'There are too many files in this directory. Only showing the first {0}.', '' + fileCount)
            })
        );
    }
    
    function FileTable(path, revisionRef) {
        var self = this;
        this.currentPath = path;
        this.currentRevisionRef = revisionRef;

        events.on('memoir.changestate', function(e) {
            var state = e.state;
            if (!state ||
                (state.path === self.currentPath.toString() && state.revisionRef.revisionName === self.currentRevisionRef.getId())) {
                //do nothing
            } else if (!state.children && !state.errors) {
                // Clicked back to initial state. We don't have JSON for this so fetch it
                self.requestData(pageState.getProject().getKey(), pageState.getRepository().getSlug(), new Path(state.path), new RevisionReference(state.revisionRef), { popState : true })
                    .done(function(data) {
                        self.dataReceived($.extend(state, data));
                    })
                    .fail(function(xhr, textStatus, errorThrown, data) {
                        self.dataReceived($.extend(state, data));
                    });
            } else {
                self.dataReceived(state);
            }
        });

        memoir.initialState({ path: path.toString(), revisionRef : revisionRef.toJSON() });

        events.on('stash.page.*.revisionRefChanged', function(revisionReference) {
            if (self.currentRevisionRef.getId() !== revisionReference.getId()) {
                self.requestData(pageState.getProject().getKey(), pageState.getRepository().getSlug(), self.currentPath, revisionReference);
            }
        });

        events.on('stash.page.*.urlChanged', function(url) {
            self.requestDataAtUrl(url);
        });
    }

    function internalizeData(data) {
        data.revisionRef = new RevisionReference(data.revisionRef);
        data.path = new Path(data.path);
        if (!isErrorResponse(data)) {
            data.parent = new Path(data.parent);
            _.each(data.children.values, function(child) {
                child.name = child.path.name;
                child.path = Path.fromParentAndName(data.path, child.name);
                child.url = child.url || buildUrl(pageState.getProject().getKey(), pageState.getRepository().getSlug(), child.path, data.revisionRef);
            });
        }
    }

    FileTable.prototype.reload = function() {
        this.requestData(pageState.getProject().getKey(), pageState.getRepository().getSlug(), this.currentPath, this.currentRevisionRef);
    };

    FileTable.prototype.dataReceived = function(data) {
        internalizeData(data);
        if (data.path) {
            this.currentPath = data.path;
        }

        if (data.revisionRef && this.currentRevisionRef.getId() !== data.revisionRef.getId()) {
            this.currentRevisionRef = data.revisionRef;
            events.trigger('stash.feature.filetable.revisionRefChanged', this, this.currentRevisionRef);
        }
        events.trigger('stash.feature.filetable.dataReceived', this, data);
    };

    FileTable.prototype.requestData = function(projectKey, repoSlug, path, revisionRef, opts) {
        return this.requestDataAtUrl(buildUrl(projectKey, repoSlug, path, revisionRef), revisionRef, opts);
    };

    var PathExtractor = new RegExp("(?:/?([^?#]*))([?][^#]*)?");
    FileTable.prototype.parsePathUrl = function (url) {
        if (url && url.length > 0) {
            var projKey = pageState.getProject().getKey(),
                repoSlug = pageState.getRepository().getSlug(),
                prefix = nav.project(projKey).repo(repoSlug).browse().build();
            url = url.substring(url.indexOf(prefix) + prefix.length);

            var results = url.match(PathExtractor);
            if (results && results.length >= 2) {
                var o = {
                    projectKey: projKey,
                    repoSlug: repoSlug,
                    path: decodeURIComponent(results[1])
                };
                if (results.length === 3) {
                    o.query = results[2];
                }
                return o;
            }
        }
        return {};
    };

    FileTable.prototype.requestDataAtUrl = function(url, revisionRef, opts) {
        var self = this,
            parsedPath = self.parsePathUrl(url),
            path = new Path(parsedPath.path),
            query = parsedPath.query ? parsedPath.query : "",
            restUrl = nav.rest().project(parsedPath.projectKey).repo(parsedPath.repoSlug).browse().path(path).build() + query;

        opts = opts || {};
        var handlePushState = function (data) {
            if (!opts.popState) {
                var state = self.data = $.extend({}, data, {
                    revisionRef : (revisionRef || self.currentRevisionRef).toJSON(),
                    projectKey: parsedPath.projectKey,
                    repoSlug: parsedPath.repoSlug,
                    path: parsedPath.path,
                    prevUrl: window.location.href
                });

                var href = window.location.href,
                    currentPath = href.substring(window.location.href.indexOf(window.location.pathname));
                if (currentPath !== url) {
                    memoir.pushState(state, '', url);
                } else {
                    self.dataReceived(state);
                }
            }
        };

        //the spinner is stopped in dataReceived, this is done later to cover more of the processing
        events.trigger('stash.feature.filetable.showSpinner', this, true);
        return ajax.rest({
                url : restUrl,
                statusCode : ajax.ignore404WithinRepository()
            })
            .done(function(data) {
                handlePushState(data);
            })
            .fail(function(xhr, textStatus, errorThrown, data) {
                handlePushState(data);
            });
    };

    function FileTableView(container) {
        var self = this;
        this.fileTableSelector = container;
        this.$spinner = $("<div class='spinner'/>").hide().insertAfter(this.fileTableSelector);

        // Optimisation. Only intercept clicks if pushState is supported
        if (memoir.nativeSupport()) {
            $(document).on('click', container + ' .folder a', function(e) {
                if (domEventUtil.openInSameTab(e)) {
                    events.trigger('stash.feature.filetable.urlChanged', self, $(this).attr("href"));
                    e.preventDefault();
                }
            });
        } else {
            $(document).on('click', container + ' .folder a', function(e) {
                events.trigger('stash.feature.filetable.showSpinner', this);
            });
        }

        events.on('stash.feature.filetable.showSpinner', function() {
            $('.filebrowser-banner').empty();
            $(self.fileTableSelector).empty();
            self.$spinner.show().spin('large');
        });

        events.on('stash.feature.filetable.dataReceived', function(data) {
            var prev = getPrevChildDirOrFileName();
            self.update(data);
            events.trigger('stash.feature.filetable.hideSpinner', this);

            if (isErrorResponse(data)) {
                return;
            }

            if (data.children.size === 1 && data.children.values[0].type === DIRECTORY) {
                var onlyChild = $(self.fileTableSelector+' .folder a')[1];
                if (onlyChild.text !== prev) {
                    onlyChild.click();
                }
            }
        });

        events.on('stash.feature.filetable.hideSpinner', function() {
            self.$spinner.spinStop().hide();
        });

        this.focusInitialRow();
    }

    var DIRECTORY = "DIRECTORY";
    FileTableView.prototype.getSortedFiles = function (files) {
        if (!files || files.length === 0) {
            return files;
        }

        // If you change this logic please update the corresponding logic in ViewFile.java
        return files.sort(function (a, b) {
            // Directories at the top - everything else down the bottom
            if (a.type === DIRECTORY ^ b.type === DIRECTORY) {
                return a.type === DIRECTORY ? -1 : 1;
            } else {
                // sort 'AbcaBC' into 'AaBbCc' - alphabetical first, then by case.
                // NOTE: FF and WebKit return DIFFERENT ORDERING for 'a'.localeCompare('A'), so we can't use it.
                // FF is very backward since it returns the opposite for 'a' < 'A'
                return a.path.getName().toLowerCase().localeCompare(b.path.getName().toLowerCase()) ||
                       (a.path.getName() === b.path.getName() ? 0 : a.path.getName() < b.path.getName() ? -1 : 1);
            }
        });
    };


    FileTableView.prototype.update = function (data) {
        if (isErrorResponse(data)) {
            this.handleError(data);
        } else {
            var files = data.children.values,
                isTruncated = !data.children.isLastPage;

            // Sort the files if we have only one page (ie, is the last page)
            if (!isTruncated) {
                files = this.getSortedFiles(files);
            }

            updateWarnings(files.length, isTruncated);

            var $html = $(stash.feature.filebrowser.fileTable({
                files: files,
                parentDirectoryUrl: getParentURL(pageState.getProject().getKey(), pageState.getRepository().getSlug(), data.path, data.revisionRef)
            }));

            $(this.fileTableSelector).replaceWith($html);
            this.focusInitialRow();
        }
        events.trigger('stash.feature.filetable.pathChanged', this, data.path);
    };

    FileTableView.prototype.handleError = function (data) {
        var errorMessage = data && data.errors && data.errors.length ?
                           data.errors[0].message :
                           stash_i18n('stash.web.ajax.unexpected.error', "An unexpected error occurred.");

        var html = stash.feature.filebrowser.fileTable({
            files: [],
            isError: true,
            errorMessage: errorMessage
        });

        $(this.fileTableSelector).replaceWith($(html));
    };

    FileTableView.prototype.getParentDirSelector = function() {
        return this.fileTableSelector + ' tr.browse-up a';
    };

    FileTableView.prototype.focusInitialRow = function() {
        var $rows = $(this.fileTableSelector).find('tr.file-row').not('.browse-up'),
            $prevDirOrFile,
            prevDirOrFileName = getPrevChildDirOrFileName();

        if (prevDirOrFileName) {
            $prevDirOrFile = $rows.filter(function () {
                return $(this).text() === prevDirOrFileName;
            });
        }

        if ($prevDirOrFile && $prevDirOrFile.length) {
            $prevDirOrFile.addClass('focused-file');
        } else if ($rows.first().length) {
            $rows.first().addClass('focused-file');
        }
    };

    var isErrorResponse = function (data) {
        return !(data && data.children);
    };

    exports.FileTableView = FileTableView;
    exports.FileTable = FileTable;
    exports.getChildPathDifferenceBetweenUrls = getChildPathDifferenceBetweenUrls;
});