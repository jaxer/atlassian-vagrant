define('model/revision', [
    'backbone-brace',
    'model/repository',
    'model/revision-reference'
], function(
    Brace,
    Repository,
    RevisionReference
    ) {

    'use strict';


    /**
     * Revision is a commit/changeset. It should be similar to the server-side 
     * "com.atlassian.stash.content.Changeset" class.
     * 
     */
    var Revision = Brace.Model.extend({
        namedAttributes : {
            'id' : null,
            'displayId' : null,
            'repository' : Repository,
            'message' : null,
            'author' : null,
            'authorTimestamp' : null,
            'parents' : null,
            'attributes' : null
        },
        hasParents : function() {
            return this.getParents() && this.getParents().length;
        },
        getRevisionReference : function() {
            return new RevisionReference({
                id : this.getId(),
                displayId : this.getDisplayId(),
                type : RevisionReference.type.COMMIT,
                repository : this.getRepository(),
                latestChangeset : this.getId()
            });
        }
    });


    // We have to add the type checking after Revision is already created so we can type-check against the Revision class.
    Brace.Mixins.applyMixin(Revision, {
        namedAttributes : {
            parents : [ Revision ]
        }
    });

    return Revision;
});