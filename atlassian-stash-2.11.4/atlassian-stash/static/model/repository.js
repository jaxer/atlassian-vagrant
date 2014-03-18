define('model/repository', [
    'backbone-brace',
    'model/project',
    'util/deprecation'
], function(
    Brace,
    Project,
    deprecate
    ) {

    'use strict';

    var Repository = Brace.Model.extend({
        namedAttributes : {
            'id' : 'number',
            'name' : 'string',
            'slug' : 'string',
            'project' : Project,
            'public' : 'boolean',
            'scmId' : 'string',
            'state' : 'string',
            'statusMessage' : 'string',
            'forkable' : 'boolean',
            'cloneUrl' : 'string',
            'link' : Object,
            'links' : Object,
            'origin' : null
        },
        isEqual: function(repo){
            //TODO: Needs test
            return !!(repo && repo instanceof Repository && this.id === repo.id);
        }
    });

    // Need a reference to Repository so must add type checks for origin after creation.
    Brace.Mixins.applyMixin(Repository, {
        namedAttributes : {
            origin : Repository
        }
    });

    deprecate.braceAsJson(Repository, 'Repository', '2.4', '3.0');

    return Repository;
});