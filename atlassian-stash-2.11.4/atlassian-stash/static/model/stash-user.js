define('model/stash-user', [
    'model/person',
    'util/deprecation'
], function(
    Person,
    deprecate
    ) {

    'use strict';

    var StashUser = Person.extend({
        namedAttributes : {
            'active': 'boolean',
            'avatarUrl': 'string',
            'displayName': 'string',
            'id': 'number',
            'isAdmin': 'boolean',
            'link' : Object,
            'links' : Object,
            'slug' : 'string'
        }
    });

    deprecate.braceAsJson(StashUser, 'StashUser', '2.5', '3.0');

    return StashUser;
});
