define('model/participant-collection', [
    'backbone-brace',
    'underscore',
    'model/participant'
], function(
    Brace,
    _,
    Participant
    ) {

    'use strict';

    return Brace.Collection.extend({
        model: Participant,
        /* This is also used by SortParticipantsFunction */
        comparator: function(a, b) {
            return (a.getApproved() === b.getApproved()) ?
                (a.getUser().getDisplayName()).localeCompare(b.getUser().getDisplayName()) :
                a.getApproved() ? -1 : 1;
        },
        findByUser: function(user) {
            return _.find(this.models, function(participant) {
                return participant.getUser().getName() === user.getName();
            });
        }
    });
});