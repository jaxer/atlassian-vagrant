define('model/conflict', [
    'backbone-brace',
    'model/conflict-change',
    'model/file-change-types',
    'util/deprecation'
], function (
    Brace,
    ConflictChange,
    ChangeType,
    deprecate
) {

    'use strict';

    var messageMatrix = {};

        messageMatrix[ChangeType.ADD] = {};
        messageMatrix[ChangeType.ADD][ChangeType.ADD]         = stash_i18n('stash.web.pull-request.diff.conflict.title.add.add',        'Conflict: Added file to Source, Added same file to Target');
        messageMatrix[ChangeType.ADD][ChangeType.RENAME]      = stash_i18n('stash.web.pull-request.diff.conflict.title.add.add',        'Conflict: Added file to Source, Renamed to same on Target');
        messageMatrix[ChangeType.ADD][ChangeType.MOVE]        = stash_i18n('stash.web.pull-request.diff.conflict.title.add.add',        'Conflict: Added file to Source, Moved to same on Target');

        messageMatrix[ChangeType.MODIFY] = {};
        messageMatrix[ChangeType.MODIFY][ChangeType.MODIFY]   = stash_i18n('stash.web.pull-request.diff.conflict.title.modify.modify',  'Conflict: Modified on Source, Modified on Target');
        messageMatrix[ChangeType.MODIFY][ChangeType.RENAME]   = stash_i18n('stash.web.pull-request.diff.conflict.title.modify.rename',  'Conflict: Modified on Source, Renamed on Target');
        messageMatrix[ChangeType.MODIFY][ChangeType.MOVE]     = stash_i18n('stash.web.pull-request.diff.conflict.title.modify.move',    'Conflict: Modified on Source, Moved on Target');
        messageMatrix[ChangeType.MODIFY][ChangeType.DELETE]   = stash_i18n('stash.web.pull-request.diff.conflict.title.modify.delete',  'Conflict: Modified on Source, Deleted on Target');

        messageMatrix[ChangeType.RENAME] = {};
        messageMatrix[ChangeType.RENAME][ChangeType.ADD]      = stash_i18n('stash.web.pull-request.diff.conflict.title.rename.add',     'Conflict: Renamed on Source, Added same to Target');
        messageMatrix[ChangeType.RENAME][ChangeType.RENAME]   = stash_i18n('stash.web.pull-request.diff.conflict.title.rename.rename',  'Conflict: Renamed on Source, Renamed on Target');
        messageMatrix[ChangeType.RENAME][ChangeType.MOVE]     = stash_i18n('stash.web.pull-request.diff.conflict.title.rename.move',    'Conflict: Renamed on Source, Moved on Target');
        messageMatrix[ChangeType.RENAME][ChangeType.DELETE]   = stash_i18n('stash.web.pull-request.diff.conflict.title.rename.delete',  'Conflict: Renamed on Source, Deleted on Target');

        messageMatrix[ChangeType.MOVE] = {};
        messageMatrix[ChangeType.MOVE][ChangeType.ADD]        = stash_i18n('stash.web.pull-request.diff.conflict.title.move.add',       'Conflict: Moved on Source, Added same to Target');
        messageMatrix[ChangeType.MOVE][ChangeType.RENAME]     = stash_i18n('stash.web.pull-request.diff.conflict.title.move.rename',    'Conflict: Moved on Source, Renamed on Target');
        messageMatrix[ChangeType.MOVE][ChangeType.MOVE]       = stash_i18n('stash.web.pull-request.diff.conflict.title.move.move',      'Conflict: Moved on Source, Moved on Target');
        messageMatrix[ChangeType.MOVE][ChangeType.DELETE]     = stash_i18n('stash.web.pull-request.diff.conflict.title.move.delete',    'Conflict: Moved on Source, Deleted on Target');

        messageMatrix[ChangeType.DELETE] = {};
        messageMatrix[ChangeType.DELETE][ChangeType.MODIFY]   = stash_i18n('stash.web.pull-request.diff.conflict.title.delete.modify',  'Conflict: Deleted on Source, Modified on Target');
        messageMatrix[ChangeType.DELETE][ChangeType.RENAME]   = stash_i18n('stash.web.pull-request.diff.conflict.title.delete.rename',  'Conflict: Deleted on Source, Renamed on Target');
        messageMatrix[ChangeType.DELETE][ChangeType.MOVE]     = stash_i18n('stash.web.pull-request.diff.conflict.title.delete.move',    'Conflict: Deleted on Source, Moved on Target');

    var Conflict = Brace.Model.extend({
        namedAttributes : {
            'ourChange' : ConflictChange,
            'theirChange' : ConflictChange
        },
        getConflictMessage : function() {
            //'our' describes the change that was made on the destination branch relative to a shared
            //ancestor with the incoming branch.
            //'their' describes the change that was made on the incoming branch relative to a shared
            //ancestor with the destination branch
            var destinationModState = this.getOurChange() && this.getOurChange().getType(),
                incomingModState = this.getTheirChange() && this.getTheirChange().getType();

            return (messageMatrix[incomingModState] && messageMatrix[incomingModState][destinationModState]) || '';
        }
    });

    deprecate.braceAsJson(Conflict, 'Conflict', '2.4', '3.0');

    return Conflict;
});
