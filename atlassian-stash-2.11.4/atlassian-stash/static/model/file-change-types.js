define('model/file-change-types', function() {

    'use strict';

    return {
        ADD : 'ADD',
        DELETE : 'DELETE',
        MODIFY : 'MODIFY',
        COPY : 'COPY',
        MOVE : 'MOVE',
        RENAME: 'RENAME',
        UNKNOWN : 'UNKNOWN',
        changeTypeFromId: function(id){
            if (Object.prototype.hasOwnProperty.call(this, id) && typeof this[id] === 'string') {
                return this[id];
            }

            return undefined;
        }
    };
});