define("layout/branch",["jquery","underscore","util/events","util/navbuilder","model/page-state","feature/repository/revision-reference-selector","exports"],function(F,C,E,G,D,B,A){A.onReady=function(H){var J=function(K){K=B.prototype._addRefTypeAndRepositoryToResults.call(this,K);var L=G.parse(window.location.href);C.each(K.values,function(N){if(!N.url){var M=L.clone();M.replaceQueryParam("at",N.id);N.url=M.query()+(M.anchor()?M.anchor():"")}});return K};var I=new B(F(H),{id:"repository-layout-revision-selector-dialog",dataTransform:J});D.setRevisionRef(I.getSelectedItem());E.on("stash.feature.repository.revisionReferenceSelector.revisionRefChanged",function(K){if(this===I){E.trigger("stash.layout.branch.revisionRefChanged",this,K);D.setRevisionRef(I.getSelectedItem())}});E.on("stash.page.*.revisionRefChanged",function(K){I.setSelectedItem(K)});E.on("stash.widget.keyboard-shortcuts.register-contexts",function(K){K.enableContext("branch")});F("#branch-actions-menu").on("aui-dropdown2-show",function(){E.trigger("stash.layout.branch.actions.dropdownShown");F("#branch-actions").focus();F(this).html(stash.layout.branch.actionsDropdownMenu({repository:D.getRepository().toJSON(),atRevisionRef:D.getRevisionRef().toJSON()}))}).on("aui-dropdown2-hide",function(){E.trigger("stash.layout.branch.actions.dropdownHidden")})}});