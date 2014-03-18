define('feature/repository/cloneUrlGen', [
    'jquery',
    'unorm',
    'model/page-state',
    'util/navbuilder',
    'exports'
], function(
    $,
    unorm,
    pageState,
    navbuilder,
    exports
) {

    function slugify(name) {
        return unorm.nfkd(name)
            .replace(/[^\x00-\x7F]+/g, "")
            .replace(/[^a-zA-Z\-_0-9\\.]+/g, "-")
            .toLowerCase();
    }

    function bindUrlGeneration(input, target, getProject) {
        var $input = $(input),
            $target = $(target),
            hidden = false;

        getProject = getProject || pageState.getProject;

        if (!$target.val()) {
            $target.hide();
            hidden = true;
        }

        var poller = function() {
            function hideTarget() {
                $target.fadeOut('fast');
                hidden = true;
            }
            function showTarget() {
                $target.fadeIn('fast');
                hidden = false;
            }
            function setText(text) {
                $target.text(text);
            }

            var project = getProject();

            if (project) {
                var slug = slugify($input.val() || ''),
                    nav = navbuilder.project(project),
                    val = slug ? nav.repo(slug).clone('git').buildAbsolute() : '';


                if (!slug && !hidden) {
                    hideTarget();
                } else if (slug && hidden) {
                    setText(val);
                    showTarget();
                } else {
                    setText(val);
                }
            } else if (!hidden) {
                hideTarget();
            }

            setTimeout(poller, 100);
        };
        setTimeout(poller, 100);
    }

    exports.bindUrlGeneration = bindUrlGeneration;
    exports.slugify = slugify;
});
