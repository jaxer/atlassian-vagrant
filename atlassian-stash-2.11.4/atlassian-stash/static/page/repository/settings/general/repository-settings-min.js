define("page/repositoryGeneralSettings",["jquery","aui","util/ajax","util/navbuilder","util/error","util/flash-notifications","model/page-state","widget/confirm-dialog","feature/project/project-selector","feature/repository/branch-selector","feature/repository/cloneUrlGen","exports"],function(G,K,I,A,D,H,J,N,C,L,B,E){function F(){var Q=new K.Dialog({id:"repository-move-dialog"});var S=stash.page.moveRepositoryForm({repository:J.getRepository().toJSON()});Q.addHeader(stash_i18n("stash.web.repository.move.title","Move repository"));Q.addPanel("",S);var R=G("#moveProjectSelector");var T=new C(R,{field:R.next("input")});B.bindUrlGeneration("#moveName","#moveName + .description .clone-url > span",function(){return T.getSelectedItem()});function P(){var V=G("#moveName").val();var U=T.getSelectedItem().toJSON();if(V===J.getRepository().getName()&&U.key===J.getProject().getKey()){Q.hide();return }I.rest({type:"PUT",url:A.rest().currentRepo().build(),data:{name:V,project:U},statusCode:{"400":false,"409":false}}).done(function(W){H.addNotification(W.project.key===J.getProject().getKey()?stash_i18n("stash.web.repository.rename.success","{0} successfully renamed to {1}",J.getRepository().getName(),W.name):stash_i18n("stash.web.repository.move.success","{0} successfully moved into {1}",W.name,W.project.name));location.href=A.project(W.project.key).repo(W.slug).settings().build()}).fail(function(Z,W,Y,X){D.setFormErrors(Q.popup.element.find("form.aui"),_.chain(X.errors).filter(function(a){return a.context!=="slug"}).map(function(a){var b=a.context;if(b==="project"||b==="name"){a.context="move"+b.charAt(0).toUpperCase()+b.slice(1)}return a}).value());Q.updateHeight()})}Q.addButton(stash_i18n("stash.web.button.move","Move"),P,"button");Q.popup.element.find("form.aui").on("submit",function(U){U.preventDefault();P()});Q.addCancel(stash_i18n("stash.web.button.cancel","Cancel"),function(){T.dialog.hide();Q.hide()});return Q}function M(P){var Q;G(P).on("click",function(R){R.preventDefault();if(!Q){Q=F()}Q.show();D.clearFormErrors(Q.popup.element);Q.updateHeight()})}function O(T){var Q=J.getRepository();var S=G("<p>").html(stash_i18n("stash.web.repository.delete.confirm","Are you sure you want to delete {0}?","<b>"+K.escapeHtml(Q.getName())+"</b>"));var P=G("<p>").html(stash_i18n("stash.web.repository.delete.confirm.detail","This cannot be undone. All of the repository''s contents will be irretrievably lost if they are not also stored elsewhere. All pull requests to this repository will also be deleted."));G.merge(S,P);var R=new N({id:"delete-repository-dialog",titleText:stash_i18n("stash.web.repository.delete.title","Delete repository"),titleClass:"warning-header",panelContent:S,submitText:stash_i18n("stash.web.button.delete","Delete"),height:240},{type:"DELETE"});R.attachTo(T);R.addConfirmListener(function(U){U.then(function(W,V,X){return I.poll({url:G(T).attr("href"),statusCode:{"404":function(){H.addNotification(stash_i18n("stash.web.repository.deleted","The repository {0} has been deleted.",Q.getName()));window.location=A.currentProject().build();return false}}})})})}E.onReady=function(R,P,S){H.attachNotifications(R,"before");M(P);O(S);var Q=new L(G("#default-branch"),{field:G("#default-branch-field")});B.bindUrlGeneration("#name","#name + .description .clone-url > span")}});