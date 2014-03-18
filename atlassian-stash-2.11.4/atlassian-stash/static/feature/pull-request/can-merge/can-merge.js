define('feature/pull-request/can-merge', [
    'util/events',
    'util/ajax',
    'model/page-state',
    'util/navbuilder'
], function(
    events,
    ajax,
    pageState,
    navBuilder
) {

    function canMerge(pullRequest){
         pullRequest = pullRequest || pageState.getPullRequest();

         return ajax.rest({
             url: navBuilder.rest()
                 .currentRepo()
                 .pullRequest(pullRequest.getId())
                 .merge()
                 .build(),
             type: 'GET'
         }).done(function(data) {
            events.trigger(data.canMerge ? 'stash.pull-request.can.merge' : 'stash.pull-request.cant.merge', null, pullRequest, data.conflicted, data.vetoes);
         });
     }

    return canMerge;
});
