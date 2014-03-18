define('model/file-change', [
    'backbone-brace',
    'model/commit-range',
    'model/conflict',
    'model/file-change-types',
    'model/path',
    'model/repository'
], function (
    Brace,
    CommitRange,
    Conflict,
    ChangeType,
    Path,
    Repository
) {

    'use strict';

    var FileChange = Brace.Model.extend({
        namedAttributes : {
            "repository" : Repository,
            "commitRange" : CommitRange,
            "srcPath" : Path,
            "path" : Path,
            "type" : null,
            "nodeType" : null,
            "conflict" : Conflict,
            "diff" : null,
            "srcExecutable" : null,
            "executable" : null
        },
        initialize : function() {
            this.setType(
                FileChange._mapChangeType(
                    this.getType(),
                    this.getSrcPath(),
                    this.getPath()
                )
            );
        }
    }, {
        fromDiff : function(diffJson, commitRange, repository) {

            // Let's work out the ChangeType for this file so we can consistently use it everywhere.
            var type;
            var firstHunk = diffJson.hunks[0];
            if (firstHunk) {
                // If we're looking at a Diff then the ChangeType will always be one of Add/Delete/Modify
                // if the file was only Moved/Renamed there would not be a diff.
                if (firstHunk.sourceLine === 0) {
                    type = ChangeType.ADD;
                } else if (firstHunk.destinationLine === 0) {
                    type = ChangeType.DELETE;
                } else {
                    type = ChangeType.MODIFY;
                }
            }

            return new FileChange({
                repository : repository,
                commitRange : commitRange,
                srcPath : diffJson.source,
                path : diffJson.destination,
                diff : diffJson,
                type: type
            });
        },
        _mapChangeType : function(modState, srcPath, path) {
            return (modState === ChangeType.MOVE && srcPath && srcPath.isSameDirectory(path)) ?
                    ChangeType.RENAME :
                    ChangeType.changeTypeFromId(modState);
        }
    });

    return FileChange;
});
