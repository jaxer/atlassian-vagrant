define('model/participant', [
    'backbone-brace',
    'model/stash-user'
], function(
    Brace,
    StashUser
    ) {

    'use strict';

    return Brace.Model.extend({
        namedAttributes : {
            'approved': 'boolean',
            'role' : 'string',
            'user' : StashUser
        }
    });
});