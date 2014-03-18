define('feature/changeset/changeset-badge', ['jquery', 'exports'], function ($, exports) {
    exports.create = function(changeset, repository) {
        return $(stash.feature.changeset.changesetBadge.oneline({
            changeset : changeset,
            repository : repository,
            withAvatar : true
        }));
    };
});
