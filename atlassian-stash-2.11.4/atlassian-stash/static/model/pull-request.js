define('model/pull-request', [
    'backbone-brace',
    'model/participant',
    'model/participant-collection',
    'model/revision-reference'
], function(
    Brace,
    Participant,
    Participants,
    RevisionReference
    ) {

    'use strict';

    return Brace.Model.extend({
        namedAttributes : {
            'id' : null,
            'link' : null,
            'links' : Object,
            /**
             * The fromRef is a Ref to the source/from branch. This is the "until"/"new" side of any diff.
             */
            'fromRef' : RevisionReference,
            /**
             * The toRef is a Ref to the target/to branch. This is the "since"/"old" side of any diff.
             */
            'toRef' : RevisionReference,
            'author' : Participant,
            'reviewers' : Participants,
            'participants' : Participants,
            'state' : null,
            'open' : 'boolean',
            'closed' : 'boolean',
            'title' : null,
            'createdDate' : Date,
            'updatedDate' : Date,
            'version' : null,
            'description' : null,
            'descriptionAsHtml' : null
        },
        addParticipant : function(participant) {
            var exists = this.getParticipants().findByUser(participant.getUser());

            if (!exists) {
                this.getParticipants().add(participant);
            }
        }
    }, {
        state: {
            OPEN: "OPEN",
            MERGED: "MERGED",
            DECLINED: "DECLINED"
        }
    });
});