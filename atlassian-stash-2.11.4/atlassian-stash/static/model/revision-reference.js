define('model/revision-reference', [
    'backbone-brace',
    'underscore',
    'model/page-state',
    'model/repository'
], function(
    Brace,
    _,
    pageState,
    Repository
    ) {

    'use strict';

    var Type = {
        TAG: {
            id: "tag",
            name: stash_i18n('stash.web.revisionref.tag.name', 'Tag')
        },
        BRANCH: {
            id: "branch",
            name: stash_i18n('stash.web.revisionref.branch.name', 'Branch')
        },
        COMMIT: {
            id: "commit",
            name: stash_i18n('stash.web.revisionref.commit.name', 'Commit')
        },
        isTag: function (o) {
            return o && (o === Type.TAG.id || o.id === Type.TAG.id);
        },
        isBranch: function (o) {
            return o && (o === Type.BRANCH.id || o.id === Type.BRANCH.id);
        },
        isCommit: function(o) {
            return o && (o === Type.COMMIT.id || o.id === Type.COMMIT.id);
        },
        from: function (o) {
            if (Type.isTag(o)) {
                return Type.TAG;
            } else if (Type.isBranch(o)) {
                return Type.BRANCH;
            } else if (Type.isCommit(o)) {
                return Type.COMMIT;
            }
            window.console && console.error("Unknown RevisionReference type " + o);
            return null;
        }
    };

    /**
     * RevisionReference is a "reference" to a commit. This could be a branch, or a tag, or a direct
     * commit hash. It should be similar to the server-side "com.atlassian.stash.repository.Ref" class.
     * 
     */
    var RevisionReference = Brace.Model.extend({
        namedAttributes : {
            'id' : 'string',
            'displayId' : 'string',
            'type' : Type.from,
            'isDefault' : 'boolean',
            'latestChangeset' : 'string',
            'hash' : 'string',  //Tags can also have a hash property when they aren't simply pointers to a changeset, this points to the rich tag object
            'repository' : Repository
        },
        initialize : function() {
            if (!this.getDisplayId()) {
                this.setDisplayId(this.getId());
            }
            if (!this.getIsDefault()) {
                this.setIsDefault(false);
            }
            if (!this.getRepository()){
                this.setRepository(pageState.getRepository());
            }
        },
        getTypeName : function() {
            return this.getType().name;
        },
        isDefault : function() {
            return this.getIsDefault() || false;
        },
        isTag : function() {
            return Type.isTag(this.getType());
        },
        isBranch : function() {
            return Type.isBranch(this.getType());
        },
        isCommit : function() {
            return Type.isCommit(this.getType());
        },
        isEqual : function(revisionRef) {
            return (revisionRef instanceof RevisionReference) &&
                this.getId() === revisionRef.getId() &&
                this.getType().id === revisionRef.getType().id &&
                this.getRepository().isEqual(revisionRef.getRepository());
        }
    }, {
        fromChangeset : function(changeset) {
            return new RevisionReference({
                id : changeset.id,
                displayId : changeset.displayId,
                type : Type.COMMIT,
                isDefault : false
            });
        },
        hydrateRefFromId : function(id, isDefault, typeId, latestChangeset){
            if (!_.isString(id)) {
                //Brace will catch the other type errors, but we call string methods on `id` so it must be a string.
                return null;
            }

            var idRegex = /^refs\/(heads|tags)\/(.+)/;
            var displayId = id.replace(idRegex, "$2");

            if (!typeId) {
                typeId = RevisionReference.type.BRANCH;

                var match = id.match(idRegex);

                if(match && match[1] === "tags"){
                    typeId = RevisionReference.type.TAG;
                }
            }

            return new RevisionReference({id: id, displayId: displayId, type: typeId, isDefault: isDefault, latestChangeset: latestChangeset});
        }
    });

    RevisionReference.type = Type;

    return RevisionReference;
});
