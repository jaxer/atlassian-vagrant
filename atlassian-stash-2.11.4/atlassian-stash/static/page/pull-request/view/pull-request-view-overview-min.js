define("page/pull-request/view/pull-request-view-overview",["jquery","util/navbuilder","util/events","util/deprecation","model/page-state","lib/jsuri","feature/comments/comment-tips","feature/pull-request/pull-request-activity","feature/discussion/participants-list","feature/watch"],function(F,I,A,P,L,M,D,K,R,O){var E;var B;var J;var G;var Q=false;var C;function N(S){var T=F(stash.feature.pullRequest.mergeConflictBanner({extraClasses:"transparent"})).prependTo(S).find(".manual-merge").click(function(U){U.preventDefault();A.trigger("stash.pull-request.show.cant.merge.help")}).end();setTimeout(function(){T.removeClass("transparent")},0)}function H(T){var S=L.getCurrentUser();if(S&&S.getName()===T.getUser().getName()){J.setIsWatching(true)}}A.on("stash.pull-request.cant.merge",function(T,U,S){if(!Q&&U&&E){Q=true;N(E)}});return{load:function(W){E=W;var V=L.getPullRequest();W.innerHTML=stash.page.pullRequest.viewOverview({pullRequest:P.jsonAsBrace(V,"2.5.1","3.0"),author:V.getAuthor().getUser().toJSON(),createdDate:V.getCreatedDate(),description:V.getDescription(),descriptionAsHtml:V.getDescriptionAsHtml(),currentUser:L.getCurrentUser()&&L.getCurrentUser().toJSON(),commentTips:D.tips});F(W).find("textarea.expanding").expandingTextarea();if(Q){N(W)}var U=F(".watch a");var S=I.rest().currentPullRequest().watch().build();J=new O(U,S,O.type.PULL_REQUEST);C=V.getParticipants();C.on("add",H);G=new R(C,F("#participants-dropdown ul"),F(".participants.plugin-item"));var Y=new M(window.location);var X=Y.getQueryParamValue("commentId")?"comment":"activity";var T=Y.getQueryParamValue("commentId")||Y.getQueryParamValue("activityId");B=new K(F(W).find(".pull-request-activity"),V,X,T,{scrollableElement:window});B.init()},_internalActivity:function(){return B},unload:function(S){B.reset();B=null;F(S).empty();E=null;C.off("add",H);J.destroy();J=null;G.destroy();G=null},keyboardShortcutContexts:["pull-request-overview"]}});