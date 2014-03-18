define('page/repository/emptyRepository', [
    'jquery',
    'aui',
    'model/page-state',
    'util/ajax',
    'util/events',
    'exports'
], function(
    $,
    AJS,
    pageState,
    ajax,
    events,
    exports
) {

    function updateInstructions(module, cloneUrl) {
        $('#empty-repository-instructions').html(stash.page.emptyRepositoryInstructions({
            repository: pageState.getRepository().toJSON(),
            cloneUrl: cloneUrl,
            currentUser: pageState.getCurrentUser().toJSON()
        }));
    }

    events.on('stash.feature.repository.clone.protocol.initial', updateInstructions);
    events.on('stash.feature.repository.clone.protocol.changed', updateInstructions);

    exports.onReady = function(notInitialised) {
        if ($('#empty-repository-instructions:empty').length) {
            updateInstructions(null, pageState.getRepository().getCloneUrl());
        }

        if (notInitialised) {
            var browse = "/browse",
                i = window.location.href.lastIndexOf(browse),
                pollUrl = i === -1 ? window.location.href : window.location.href.substr(0, i);
            var $initialisingContainer = $('<div id="initialising" />'),
                $initialisingMessage = $('<h2></h2>'),
                $page = $('#content .content-body');
            $initialisingMessage.text(stash_i18n('stash.web.repository.initialising', 'Initialising your repository'));

            //jquery uses a filter for opacity in IE8, and the opacity doesn't extend past pres for some reason.
            var $opacityContainers = $.browser.msie && parseInt($.browser.version, 10) < 9 ?
                $page.find('pre').andBack() :
                $page;
            $opacityContainers.css('opacity', 0.2);

            $initialisingMessage.appendTo($initialisingContainer);
            $initialisingContainer.appendTo($page.parent());
            $initialisingContainer.spin('large');
            ajax.poll({
                url: pollUrl,
                tick: function(data) {
                    var state = data && data.state;
                    if (state === 'AVAILABLE') {
                        return true;
                    } else if (state === 'INITIALISATION_FAILED') {
                        return false;
                    } else {
                        return undefined;
                    }
                }
            }).always(function() {
                $initialisingContainer.spinStop();
                $initialisingContainer.remove();
                $opacityContainers.fadeTo('fast', 1);
            }).fail(function(xhr, statusText, something, repo) {
                $page.empty().css('padding', '16px');
                if (xhr.status === 200) {
                    $(widget.aui.message.error({ content : AJS.escapeHtml(repo.statusMessage)})).appendTo($page);
                }
            });
        }

    };
});

require('page/repository/emptyRepository');