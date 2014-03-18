define('util/navbuilder', [
    'aui',
    'jquery',
    'underscore',
    'lib/jsuri',
    'util/deprecation',
    'model/page-state',
    'exports'
], function (
    AJS,
    $,
    _,
    Uri,
    deprecate,
    pageState,
    exports
) {

    'use strict';

    // The basic idea of the nav builder is to support a chain of method calls that roughly map to the structure of the
    // structure and categorisation of parts of Stash.
    //
    // E.g. nav.project('foo').repo('bar').permissions() will return a builder that can build the url for the permissions page
    // of the repository 'bar' of the project 'foo' while just nav.project('foo') will return a builder that for a url to
    // the project page for project 'foo')
    //
    // At each point in the method chain, the returned object will support methods that return a builder
    // that maps to a concept at a lower level.
    // At any point, withParams() may be called to add query parameters.
    // At most points, build() may be called to build the URL to be used. There are a few places where no URL makes sense.
    //
    // ** See the unit tests for a description of the urls that can be produced by the nav builder **

    /**
     * Encapsulates a uri path and params that make up a query string.
     * This class is immutable - all mutating operations return a new instance.
     */
    function PathAndQuery(components, params, anchor) {
        this.components = (_.isString(components) ? [components] : components) || [];
        this.params = params || {};
        this.anchor = anchor || undefined;
    }

    PathAndQuery.prototype.buildRelNoContext = function() {
        var path = '/' + _.map(this.components, encodeURIComponent).join('/');

        var params = _.reduce(this.params, function(memo, values, key) {
            if (!(_.isArray(values))) {
                values = [values];
            }
            _.forEach(values, function(value) {
                memo.push({ key : key, value : value });
            });
            return memo;
        }, []);
        var query = _.map(params,
            function (param) {
                var encodedValue = encodeURIComponent(param.value);
                return encodeURIComponent(param.key) + (encodedValue ? '=' + encodedValue : '');
            }).join("&");

        return path + (query ? '?' + query : '') + (this.anchor ? '#' + this.anchor : '');
    };

    PathAndQuery.prototype.buildRelative = function () {
        return AJS.contextPath() + this.buildRelNoContext();
    };

    PathAndQuery.prototype.buildAbsolute = function () {
        return location.protocol + "//" + location.hostname + (location.port ? ':' + location.port : '') + this.buildRelative();
    };

    PathAndQuery.prototype.toString = function() {
        return this.buildRelative();
    };

    /**
     * Adds query parameters. If a map (object) is supplied, its properties are added to the parameters.
     * If a single string is supplied, it is added as a query parameter with no value.
     * @returns a new PathAndQuery object with the updated query params
     */
    PathAndQuery.prototype.addParams = function (params) {
        var path = new PathAndQuery(this.components, _.extend({}, this.params));
        if (_.isString(params)) {
            path.params[params] = '';
        } else {
            if (params.hasOwnProperty("queryParams")) {
                path.params = _.extend(path.params, params.queryParams);
            } else if (!params.hasOwnProperty("urlMode")) {
                path.params = _.extend(path.params, params);
            }// todo - implement urlMode
        }
        return path;
    };

    /**
     * Sets the document hash. If a hash has been set previously, it is overwritten
     * @return a new PathAndQuery object with unchanged path and query string params, but with a new anchor
     */
    PathAndQuery.prototype.withFragment = function (anchor) {
        return new PathAndQuery(this.components, this.params, anchor);
    };

    /**
     * Pushes a new path component onto the list of path components.
     * @returns a new PathAndQuery object with the updated query params
     */
    PathAndQuery.prototype.pushComponents = function() {
        var path = new PathAndQuery(this.components.slice(0), this.params);
        _.each(_.toArray(arguments).slice(0), function (component) {
            if (component !== '') {
                path.components.push(component);
            }
        });
        return path;
    };

    /**
     * Returns a new builder for the current path with the properties supported by otherMethods.
     * Used after each call in the method chain to construct the next object in the chain and specify
     * exactly which calls are acceptable.
     * @returns a new builder
     */
    PathAndQuery.prototype.makeBuilder = function (otherMethods) {
        var path = this;
        return _.extend({
            _path: function() { return path; },
            build: function() { return path.buildRelative(); },
            buildAbsolute: function() { return path.buildAbsolute(); },
            parse : function() { return parse(this.build()); },
            withParams: function(params) {
                //return a new builder with the same methods as the current builder but with added query parameters
                return path.addParams(params).makeBuilder(otherMethods);
            },
            withFragment: function (anchor) {
                return path.withFragment(anchor).makeBuilder(otherMethods);
            },
            addPathComponents: function() {
                //return a new builder with the same methods as the current builder but with an augmented (new) path
                return path.pushComponents.apply(path, arguments).makeBuilder(otherMethods);
            },
            toString : function() {
                // IE8 doesn't call this when using ajax, so we should be consistent and force build() to be called
                deprecate.getMessageLogger('navbuilder.toString()', 'navbuilder.build()', '2.6', '3.0')();
                return this.build();
            }
        }, otherMethods);
    };

    // id/slug/key helpers

    // If the input is a string, it's the key/slug/id.
    // Otherwise, if it exists, assume it's a project/repo/PR
    // Otherwise, use this pageState's project/repo/PR.

    function getProjectKey(projectOrKey) {
        if (typeof(projectOrKey) === 'string') {
            return projectOrKey;
        } else if (!projectOrKey) {
            throw new Error(stash_i18n('stash.web.error.no.project', "No project key was provided."));
        }
        return projectOrKey.getKey ? projectOrKey.getKey() : projectOrKey.key;
    }
    function getCurrentProject() {
        if (pageState.getProject()) {
            return pageState.getProject();
        }
        throw new Error(stash_i18n('stash.web.error.no.project.context', "There is no project in this context."));
    }

    function getRepoSlug(repoOrSlug) {
        if (typeof(repoOrSlug) === 'string') {
            return repoOrSlug;
        } else if (!repoOrSlug) {
            throw new Error(stash_i18n('stash.web.error.no.repo', "No repository slug was provided."));
        }
        return repoOrSlug.getSlug ? repoOrSlug.getSlug() : repoOrSlug.slug;
    }

    function getHookKey(hookOrKey) {
        if (typeof(hookOrKey) === 'string') {
            return hookOrKey;
        } else if (!hookOrKey) {
            throw new Error(stash_i18n('stash.web.error.no.hook.key', "No hook key was provided."));
        }
        return hookOrKey.getDetails().getKey();
    }

    function getCurrentRepository() {
        if (pageState.getRepository()) {
            return pageState.getRepository();
        }
        throw new Error(stash_i18n('stash.web.error.no.repo.context', "There is no repository in this context."));
    }

    function getPullRequestId(prOrId) {
        if (typeof prOrId in {"string":1, "number": 1}) {
            return prOrId;
        } else if (!prOrId) {
            throw new Error(stash_i18n('stash.web.error.no.pull-request.id', "No pull request ID was provided."));
        }
        return prOrId.getId();
    }

    function getCurrentPullRequest() {
        if (pageState.getPullRequest()) {
            return pageState.getPullRequest();
        }
        throw new Error(stash_i18n('stash.web.error.no.pull-request.context', "There is no pull request in this context."));
    }

    //----------------------------------------
    //Start of fluent interface/method chains
    //----------------------------------------

    //--- Methods at the root of the chain ---

    function login() {
        return new PathAndQuery('login').makeBuilder({ next : loginNext});
    }

    function tmp() {
        return new PathAndQuery('tmp').makeBuilder({
            avatars: tmpAvatars
        });
    }

    function admin() {
        return new PathAndQuery('admin').makeBuilder({
            permissions: permissions,
            users: adminUsers,
            groups: groups,
            licensing: licensing,
            mailServer: mailServer,
            db : adminDb
        });
    }

    function restAdmin() {
        return this._path().pushComponents('admin').makeBuilder({
            users: restAdminUsers
        });
    }

    function allProjects() {
        return new PathAndQuery('projects').makeBuilder();
    }

    function globalAllRepos() {
        return new PathAndQuery('repos').makeBuilder({
            visibility: allReposWithVisibility
        });
    }

    function allReposWithVisibility(visibility) {
        return this._path().addParams({'visibility': visibility}).makeBuilder();
    }

    function captcha() {
        //Add a changing query param to ensure all browsers reload the image when refreshing it - some don't respect the HTTP headers
        return new PathAndQuery('captcha').addParams({'ts' : new Date().getTime().toString()}).makeBuilder();
    }

    function project(projectOrKey) {
        var path = new PathAndQuery(['projects', getProjectKey(projectOrKey)]);

        return maybeResolveAsUserPath(path).makeBuilder({
            allRepos: allRepos,
            repo: repo,
            createRepo: createRepo,
            settings: projSettings,
            permissions: permissions,
            remove: projDelete,
            users: adminUsers,
            groups: groups,
            avatar: projAvatar
        });
    }

    //If the project is a personal project, use the /users/slug form otherwise go with /projects/KEY form
    function maybeResolveAsUserPath(path) {
        var projectKey = path.components[1];
        var userSlugPattern = /~(.*)/;
        var result = userSlugPattern.exec(projectKey);
        if (result) {
            return new PathAndQuery(['users', result[1].toLowerCase()]);
        } else {
            return path;
        }
    }

    function currentProject() {
        return project(getCurrentProject());
    }

    function createProject() {
        return new PathAndQuery('projects').addParams('create').makeBuilder();
    }

    function rest(resourcePath) {
        resourcePath = resourcePath ? resourcePath : 'api';
        return new PathAndQuery(['rest', resourcePath, 'latest']).makeBuilder({
            project: restProj,
            currentProject : restCurrentProject,
            currentRepo: restCurrentRepo,
            currentPullRequest: restCurrentPullRequest,
            markup: restMarkup,
            profile: restProfile,
            users: restUsers,
            groups: restGroups,
            hooks: restTopLevelHooks,
            allRepos: allRepos,
            admin: restAdmin
        });
    }

    function addons() {
        return new PathAndQuery(['plugins', 'servlet', 'upm']).makeBuilder({
            requests: addonsRequests
        });
    }

    function pluginServlets() {
        return new PathAndQuery(['plugins', 'servlet']).makeBuilder({
            path: servletPath
        });
    }

    function servletPath() {
        var path = this._path();
        return path.pushComponents.apply(path, componentsFromArguments(arguments)).makeBuilder();
    }

    function addonsRequests() {
        return this._path().pushComponents('requests', 'popular').makeBuilder({
            category: function(category) {
                return this._path().addParams({category: category}).makeBuilder();
            }
        });
    }

    //--- Methods further down the chain ---

    function loginNext(url) {
        return this._path().addParams({ next : url }).makeBuilder();
    }

    function tmpAvatars(){
        return this._path().pushComponents('avatars').makeBuilder();
    }

    function permissions() {
        return this._path().pushComponents('permissions').makeBuilder({
            permission: permission,
            users: adminUsers,
            groups: groups
        });
    }

    function permission(name) {
        return this._path().pushComponents(name).makeBuilder({
            users: usersPerm,
            groups: groupsPerm,
            all: allPerm
        });
    }

    function usersPerm() {
        return this._path().pushComponents('users').makeBuilder();
    }

    function groupsPerm() {
        return this._path().pushComponents('groups').makeBuilder();
    }

    function allPerm() {
        return this._path().pushComponents('all').makeBuilder();
    }

    function anonPerm() {
        return this._path().pushComponents('anon').makeBuilder();
    }

    function nonePerm() {
        return this._path().pushComponents('none').makeBuilder();
    }

    function allRepos() {
        return maybeResolveAsUserPath(this._path()).pushComponents('repos').makeBuilder();
    }

    function adminUsers() {
        return this._path().pushComponents('users').makeBuilder({
            create: createEntity,
            deleteUser: deleteEntity,
            captcha: adminCaptcha,
            view: viewEntity,
            filter: filterEntity,
            deleteSuccess: deleteSuccess,
            permissions: permissions,
            none: nonePerm
        });
    }

    function restAdminUsers() {
        return this._path().pushComponents('users').makeBuilder();
    }

    function user(userSlug) {
        return new PathAndQuery(['users', userSlug]).makeBuilder();
    }

    function groups() {
        return this._path().pushComponents('groups').makeBuilder({
            create: createEntity,
            deleteGroup: deleteEntity,
            view: viewEntity,
            filter: filterEntity,
            deleteSuccess: deleteSuccess,
            permissions: permissions,
            none: nonePerm
        });
    }

    function licensing() {
        return this._path().pushComponents('license').makeBuilder({
            edit: editLicense
        });
    }

    function editLicense() {
        return this._path().addParams({edit: ''}).makeBuilder();
    }

    function mailServer() {
        return this._path().pushComponents('mail-server').makeBuilder();
    }

    function adminDb() {
        return this._path().pushComponents('db').makeBuilder();
    }

    function createEntity() {
        return this._path().addParams({create: ''}).makeBuilder();
    }

    function deleteEntity(name) { // delete is a reserved keyword
        return this._path().addParams({name: name}).makeBuilder();
    }

    function adminCaptcha(name) {
        return this._path().pushComponents('captcha').addParams({name: name}).makeBuilder();
    }

    function viewEntity(name) {
        return this._path().pushComponents('view').addParams({name: name}).makeBuilder();
    }

    function filterEntity(filterValue) {
        return this._path().addParams({filter: filterValue}).makeBuilder();
    }

    function deleteSuccess(name) {
        return this._path().addParams({deleted: name}).makeBuilder();
    }

    function createRepo() {
        return maybeResolveAsUserPath(this._path()).pushComponents('repos').addParams('create').makeBuilder();
    }

    function projDelete() {
        return this._path().makeBuilder();
    }

    function projSettings() {
        return this._path().pushComponents('settings').makeBuilder();
    }

    function projAvatar(size) {
        var builder = this._path().pushComponents('avatar.png');
        if (size) {
            builder = builder.addParams({s: size});
        }
        return builder.makeBuilder();
    }

    function repo(repoOrSlug) {
        return maybeResolveAsUserPath(this._path()).pushComponents('repos', getRepoSlug(repoOrSlug)).makeBuilder({
            browse: repoBrowse,
            diff : repoDiff,
            commits: repoCommits,
            branches: repoBranches,
            commit: repoCommit,
            changeset: repoCommit,
            settings: repoSettings,
            permissions: permissions,
            hooks: repoHooks,
            clone: repoClone,
            fork: repoFork,
            allPullRequests: allPullRequests,
            createPullRequest: createPullRequest,
            pullRequest: pullRequest,
            build: function () {
                return this._path().pushComponents('browse').toString(); //the stem /projects/PROJ/repos is different to the path needed if build() is called
            }
        });
    }
    function currentRepo() {
        return currentProject().repo(pageState.getRepository());
    }

    // pull path components from an arguments object.  We all .path('a', 'b') and .path(['a', 'b']) both.
    function componentsFromArguments(args) {

        //accept multiple args or accept a single arg that's an array to support .path('a', 'b') and .path(['a', 'b'])
        if (args.length === 1) {
            if (args[0] && args[0].getComponents) { // accept a Path object
                return args[0].getComponents();
            } else if ($.isArray(args[0])) {
                return args[0];
            }
        }
        return _.toArray(args);
    }

    function repoBrowse() {
        return this._path().pushComponents('browse').makeBuilder({
            path: repoBrowsePath,
            at: repoBrowsePathAt
        });
    }

    function repoBrowsePath() {
        var path = this._path();
        return path.pushComponents.apply(path, componentsFromArguments(arguments)).makeBuilder({
            at: repoBrowsePathAt,
            until: repoBrowsePathUntil,
            raw : repoBrowsePathAtRaw
        });
    }


    function repoBrowsePathAt(then) {
        var builder = this._path();
        if (then) {
            if (typeof then !== 'string') {
                then = then.displayId || then;
            }
            builder = builder.addParams({ at: then });
        }
        return builder.makeBuilder({
            until : repoBrowsePathUntil,
            raw : repoBrowsePathAtRaw
        });
    }

    function repoBrowsePathUntil(then) {
        return this._path().addParams({until: then}).makeBuilder({
            at: repoBrowsePathAt,
            raw : repoBrowsePathAtRaw
        });
    }

    function repoBrowsePathAtRaw() {
        return this._path().addParams({raw: ''}).makeBuilder();
    }

    function repoDiff(fileChangeOrPath) {
        var builder = this._path(),
            path;

        // Duck-type as adding FileChange as a dependency on navbuilder causes too much recursion in dependency stack
        var isFileChange = (
            fileChangeOrPath.getCommitRange &&
                fileChangeOrPath.getPath &&
                fileChangeOrPath.getSrcPath
            );

        if (isFileChange) {
            var commitRange = fileChangeOrPath.getCommitRange();
            path = fileChangeOrPath.getPath();
            if (commitRange.getPullRequest()) {
                builder = builder.pushComponents('pull-requests', commitRange.getPullRequest().getId());
            } else {
                builder = builder.addParams($.extend({}, {
                    until: commitRange.getUntilRevision() && commitRange.getUntilRevision().getId()
                }));
                var since = commitRange.getSinceRevision() && commitRange.getSinceRevision().getId();
                if (since) {
                    builder = builder.addParams({
                        since: since
                    });
                }
            }
        } else {
            path = fileChangeOrPath;
        }

        builder = builder.pushComponents('diff'); //need to do this separately otherwise we don't have the correct context for the next apply invocation.
        builder = builder.pushComponents.apply(builder, path && componentsFromArguments([path]));

        if (isFileChange && fileChangeOrPath.getSrcPath()) {
            builder = builder.addParams($.extend({}, { srcPath: fileChangeOrPath.getSrcPath().toString() }));
        }

        return builder.makeBuilder({
            at: repoDiffAt
        });
    }

    function repoDiffAt(then) {
        return this._path().addParams({at: then}).makeBuilder();
    }

    function repoCommits() {
        return this._path().pushComponents('commits').makeBuilder({
            until:repoCommitsUntil
        });
    }

    function repoBranches(baseRef) {
        var builder = this._path().pushComponents('branches');
        if (baseRef && !baseRef.isDefault) {
            if (typeof baseRef !== 'string') {
                baseRef = baseRef.displayId || baseRef.id || baseRef;
            }
            builder = builder.addParams({ base: baseRef });
        }
        return builder.makeBuilder();
    }

    function repoCommitsUntil(until) {
        var builder = this._path();
        if (until && !until.isDefault) {
            if (typeof until !== 'string') {
                until = until.displayId || until;
            }
            builder = builder.addParams({ until: until });
        }

        return builder.makeBuilder();
    }

    function repoCommit(commitId) {
        // commitId must be SHA1 hash
        return this._path().pushComponents('commits', commitId).makeBuilder({
            comment: repoCommitComment
        });
    }

    function repoCommitComment(commentId) {
        return this._path().addParams({
            commentId: commentId
        }).makeBuilder();
    }

    function repoSettings() {
        return this._path().pushComponents('settings').makeBuilder();
    }

    function repoHooks() {
        return this._path().pushComponents('settings', 'hooks').makeBuilder();
    }

    function repoClone(dcvsKind) {
        var path = this._path(),
            projectKey = path.components[1].toLowerCase(),
            repoSlug = path.components[3].toLowerCase();

        if (path.components[0] === 'users') {
            projectKey = "~" + projectKey;
        }

        return new PathAndQuery(['scm', projectKey, repoSlug + '.' + dcvsKind], path.params).makeBuilder();
    }

    function repoFork() {
        return this._path().addParams('fork').makeBuilder();
    }

    //--- Pull Request Methods ---

    function allPullRequests() {
        return this._path().pushComponents('pull-requests').makeBuilder();
    }

    var prCreateParamBuilders = {
        sourceBranch: pullRequestSourceBranch,
        targetBranch: pullRequestTargetBranch,
        source: deprecate.fn(pullRequestSourceBranch,
            'navbuilder.project().repo().createPullRequest().source()',
            'navbuilder.project().repo().createPullRequest().sourceBranch()', '2.4', '3.0'),
        target: deprecate.fn(pullRequestTargetBranch,
            'navbuilder.project().repo().createPullRequest().target()',
            'navbuilder.project().repo().createPullRequest().targetBranch()', '2.4', '3.0')
    };

    function createPullRequest() {
        return this._path().pushComponents('pull-requests').addParams('create').makeBuilder(prCreateParamBuilders);
    }

    function pullRequestSourceBranch(sourceBranch) {
        return this._path().addParams({sourceBranch: sourceBranch}).makeBuilder(prCreateParamBuilders);
    }

    function pullRequestTargetBranch(targetBranch) {
        return this._path().addParams({targetBranch: targetBranch}).makeBuilder(prCreateParamBuilders);
    }

    function pullRequest(prOrId) {
        return this._path().pushComponents('pull-requests', getPullRequestId(prOrId)).makeBuilder({
            unwatch: pullRequestUnwatch,
            /**
             * @deprecated since 2.0. Use overview() instead.
             */
            activity: pullRequestActivity,
            changeset: pullRequestChangeset,
            overview: pullRequestOverview,
            diff: pullRequestDiff,
            commits: pullRequestCommits,
            build: function () {
                return this._path().pushComponents('overview').toString(); //Default to overview view
            }
        });
    }
    function currentPullRequest() {
        return currentRepo.call(this).pullRequest(getCurrentPullRequest());
    }

    var pullRequestActivity = deprecate.fn(pullRequestOverview, 'navbuilder::activity()', 'navbuilder::overview()', '2.0', '3.0');

    function pullRequestOverview(){
        return this._path().pushComponents('overview').makeBuilder({
            comment: pullRequestComment
        });
    }

    function pullRequestUnwatch(){
        return this._path().pushComponents('unwatch').makeBuilder();
    }

    function pullRequestChangeset(changesetId) {
        //Unlike repository changesets, ref names like "master" are not supported here. As a result, there is
        //no need to do all the path gyrations repoChangeset does
        return this._path().pushComponents('commits', changesetId).makeBuilder();
    }

    function pullRequestComment(commentId){
        return this._path().addParams({commentId: commentId}).makeBuilder();
    }

    function pullRequestDiff(){
        return this._path().pushComponents('diff').makeBuilder({
            change: function (diffChangePath) {
                return this._path().withFragment(diffChangePath).makeBuilder();
            }
        });
    }

    function pullRequestCommits(){
        return this._path().pushComponents('commits').makeBuilder();
    }

    function restProj(projectOrKey) {
        var key = getProjectKey(projectOrKey);
        return this._path().pushComponents('projects', key).makeBuilder({
            allRepos: restAllRepos,
            repo: restRepo,
            permissions: restProjPermissions
        });
    }
    function restCurrentProject() {
        return restProj.call(this, getCurrentProject());
    }

    function restHook(hookOrKey) {
        var hookKey = getHookKey(hookOrKey);
        return this._path().pushComponents('settings').pushComponents('hooks', hookKey).makeBuilder({
            enabled: hookEnabled,
            settings: hookSettings
        });
    }

    function hookEnabled() {
        return this._path().pushComponents('enabled').makeBuilder();
    }

    function hookSettings() {
        return this._path().pushComponents('settings').makeBuilder();
    }

    function restAllRepos() {
        return this._path().pushComponents('repos').makeBuilder();
    }

    function restRepo(repoOrSlug) {
        var slug = getRepoSlug(repoOrSlug);
        return this._path().pushComponents('repos', slug).makeBuilder({
            tags: restRepoTags,
            branches: restRepoBranches,
            commits : restRepoAllCommits,
            commit: restRepoCommit,
            changeset: restRepoCommit,
            changes: routeChangesRequest,
            browse: restRepoBrowse,
            files: restRepoFind,
            related : restRepoRelated,
            pullRequest : restPullRequest,
            allPullRequests : restAllPullRequests,
            hooks : repoHooks,
            hook : restHook
        });
    }
    function restCurrentRepo() {
        return restCurrentProject.call(this).repo(getCurrentRepository());
    }

    function routeChangesRequest (commitRange) {
        if (commitRange.getPullRequest()) {
            return _.bind(restPullRequest, this)(commitRange.getPullRequest()).changes();
        } else if (commitRange.getUntilRevision()) {
            return this.changeset(commitRange).changes();
        } else {
            throw new Error("A valid commit-range is required to retrieve changes");
        }
    }

    function restRepoRelated() {
        return this._path().pushComponents('related').makeBuilder();
    }

    function restPullRequest(prOrId) {
        var id = getPullRequestId(prOrId);
        return this._path().pushComponents('pull-requests', id).makeBuilder({
            activities : function() { return this._path().pushComponents('activities').makeBuilder(); },
            approve: restApprove,
            comment : restComment,
            comments : function() { return this._path().pushComponents('comments').makeBuilder(); },
            changes: restPullRequestChanges,
            diff: restDiff,
            watch: restWatch,
            merge: restMerge,
            reopen: restReopen,
            decline: restDecline
        });
    }
    function restCurrentPullRequest() {
        return restCurrentRepo.call(this).pullRequest(getCurrentPullRequest());
    }

    function restAllPullRequests() {
        return this._path().pushComponents('pull-requests').makeBuilder();
    }

    function restComment(id) {
        return this._path().pushComponents('comments', id).makeBuilder({
            comment : restComment
        });
    }

    function restPullRequestChanges(){
        return this._path().pushComponents('changes').makeBuilder();
    }

    function restApprove() {
        return this._path().pushComponents('approve').makeBuilder();
    }

    function restWatch() {
        return this._path().pushComponents('watch').makeBuilder();
    }

    function restMerge() {
        return this._path().pushComponents('merge').makeBuilder();
    }

    function restDecline() {
        return this._path().pushComponents('decline').makeBuilder();
    }

    function restReopen() {
        return this._path().pushComponents('reopen').makeBuilder();
    }

    function restRepoTags() {
        return this._path().pushComponents('tags').makeBuilder();
    }

    function restRepoBranches() {
        return this._path().pushComponents('branches').makeBuilder();
    }

    function restRepoAllCommits() {
        return this._path().pushComponents('commits').makeBuilder();
    }

    function restRepoCommit(commitIdOrCommitRange) {
        var path = this._path().pushComponents('commits');
        if (typeof commitIdOrCommitRange === 'string') {
            path = path.pushComponents(commitIdOrCommitRange);
        } else if (commitIdOrCommitRange.getUntilRevision) {
            path = path.pushComponents(commitIdOrCommitRange.getUntilRevision().getId());

            var sinceId = commitIdOrCommitRange.getSinceRevision() && commitIdOrCommitRange.getSinceRevision().getId();
            if (sinceId) {
                path = path.addParams({ since: sinceId });
            }
        } else {
            throw new Error(stash_i18n('stash.web.error.no.commit.or.commitRange', "No commit id or commit range was provided."));
        }

        return path.makeBuilder({
            diff: restDiff,
            changes: restChangesetChanges,
            comments: restChangesetComment,
            watch: restCommitWatch
        });
    }

    function restCommitWatch() {
        return this._path().pushComponents('watch').makeBuilder();
    }

    function restChangesetChanges() {
        return this._path().pushComponents('changes').makeBuilder({
            path: restChangesetPath
        });
    }

    function restDiff(fileChange) {
        var builder = this._path();

        builder = builder.pushComponents('diff');
        builder = builder.pushComponents.apply(builder, componentsFromArguments([fileChange.getPath()]));

        if (fileChange.getSrcPath()) {
            builder = builder.addParams({ srcPath: fileChange.getSrcPath().toString() });
        }

        return builder.makeBuilder();
    }

    function restChangesetComment() {
        return this._path().pushComponents('comments').makeBuilder({
            path: restChangesetPath
        });
    }

    function restChangesetPath(path) {
        return this._path().addParams({
            path: path.toString()
        }).makeBuilder();
    }

    function restRepoBrowse() {
        return this._path().pushComponents('browse').makeBuilder({
            path: repoBrowsePath,
            at: repoBrowsePathAt
        });
    }

    function restRepoFind() {
        return this._path().pushComponents('files').makeBuilder({
            all: restRepoAllFiles,
            path: restRepoFilesInPath,
            at: repoBrowsePathAt
        });
    }

    function restRepoAllFiles() {
        return this._path().addParams({limit: 100000}).makeBuilder({
            path: restRepoFilesInPath,
            at: repoBrowsePathAt
        });
    }

    function restRepoFilesInPath() {
        var path = this._path();
        return path.pushComponents.apply(path, componentsFromArguments(arguments)).makeBuilder({
            at: repoBrowsePathAt
        });
    }

    function restProjPermissions() {
        return this._path().pushComponents('permissions').makeBuilder({
            projectRead: restProjReadPerms,
            projectWrite: restProjWritePerms
        });
    }

    function restProjReadPerms() {
        return this._path().pushComponents('project-read').makeBuilder({
            all: restAllProjPerms,
            anon: restAnonProReadPerms
        });
    }

    function restProjWritePerms() {
        return this._path().pushComponents('project-write').makeBuilder({
            all: restAllProjPerms
        });
    }

    function restAllProjPerms() {
        return this._path().pushComponents('all').makeBuilder({
            allow: restAllowProjPerms
        });
    }

    function restAnonProReadPerms() {
        return this._path().pushComponents('anon').makeBuilder({
            allow: restAllowProjPerms
        });
    }

    function restAllowProjPerms(allow) {
        return this._path().addParams({'allow': allow}).makeBuilder();
    }

    function restMarkup() {
        return this._path().pushComponents('markup').makeBuilder({
            preview: restMarkupPreview
        });
    }

    function restMarkupPreview() {
        return this._path().pushComponents('preview').makeBuilder();
    }

    function restProfile() {
        return this._path().pushComponents('profile').makeBuilder({
            recent: restProfileRecent
        });
    }

    function restProfileRecent() {
        return this._path().pushComponents('recent').makeBuilder({
            repos: restProfileRecentRepos
        });
    }

    function restProfileRecentRepos() {
        return this._path().pushComponents('repos').makeBuilder();
    }

    function restUsers() {
        return this._path().pushComponents('users').makeBuilder();
    }

    function restGroups() {
        return this._path().pushComponents('groups').makeBuilder();
    }

    function restTopLevelHooks() {
        return this._path().pushComponents('hooks').makeBuilder({
            hook: restTopLevelHook
        });
    }

    function restTopLevelHook(hookKey) {
        return this._path().pushComponents(hookKey).makeBuilder({
            avatar: restHookAvatar
        });
    }

    function restHookAvatar(version) {
        return this._path().pushComponents('avatar').addParams({'version': version}).makeBuilder();
    }

    function restRepoSearch() {
        return this._path().pushComponents('repos').makeBuilder();
    }

    // HACKY CODE CHECK: off
    var fallbackUrlPattern = /(default-avatar-)\d+(\.png)/;
    function avatarUrl(person, size) {
        return {
            build : function() {
                var uri = parse(person.avatarUrl);
                if (uri.getQueryParamValue("s")) {
                    uri.replaceQueryParam("s", size);
                }
                return uri.toString().replace(fallbackUrlPattern, "$1" + size + "$2");
            }
        };
    }
    // HACKY CODE CHECK: on

    /* Parse URIs */
    function parse(uri) {
        return new Uri(uri);
    }

    //Append trailing slash to url if there isn't one already.
    function appendSlashToUrl(url) {
        if (typeof url !== 'string') {
            return '/';
        } else {
            return url + ((url.charAt(url.length - 1) !== '/') ? '/' : '');
        }
    }

    function newBuilder(components, params) {
        return new PathAndQuery(components, params);
    }


    exports.login = login;
    exports.tmp = tmp;
    exports.captcha = captcha;
    exports.admin = admin;
    exports.user = user;
    exports.project = project;
    exports.pluginServlets = pluginServlets;
    exports.addons = addons;
    exports.allProjects = allProjects;
    exports.allRepos = globalAllRepos;
    exports.createProject = createProject;
    exports.currentProject = currentProject;
    exports.currentRepo = currentRepo;
    exports.currentPullRequest = currentPullRequest;
    exports.rest = rest;
    exports.parse = parse;
    exports.appendSlashToUrl = appendSlashToUrl;
    exports.avatarUrl = avatarUrl;
    exports.newBuilder = newBuilder;
});
