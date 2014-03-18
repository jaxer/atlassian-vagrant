define('model/conflict-change', [
    'backbone-brace',
    'model/file-change-types',
    'model/path'
], function(
    Brace,
    ChangeType,
    Path
) {
    
    "use strict";

    var ConflictChange = Brace.Model.extend({
        namedAttributes : {
            "srcPath" : Path,
            "path" : Path,
            "type" : null
        },
        initialize : function() {
            this.setType(
                ConflictChange._mapChangeType(
                    this.getType(),
                    this.getSrcPath(),
                    this.getPath()
                )
            );
        }
    }, {
        _mapChangeType : function(modState, srcPath, path) {
            return (modState === ChangeType.MOVE && srcPath && srcPath.isSameDirectory(path)) ?
                    ChangeType.RENAME :
                    ChangeType.changeTypeFromId(modState);
        }
    });
    return ConflictChange;
});