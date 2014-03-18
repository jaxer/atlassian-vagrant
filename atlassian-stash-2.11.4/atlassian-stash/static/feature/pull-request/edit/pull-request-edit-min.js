define("feature/pull-request-edit",["jquery","underscore","util/ajax","util/focus-snapshot","util/navbuilder","util/dom-event","util/events","util/warn-before-unload","model/revision-reference","widget/mentionable-textarea","widget/markup-preview","feature/repository/branch-selector","feature/user/user-multi-selector"],function(J,N,L,Q,B,F,O,H,A,I,P,M,C){var E="reviewers",K="com.atlassian.stash.pull.PullRequestOutOfDateException";function G(S,R){var T={width:800,height:350,id:"edit-pull-request-dialog",closeOnOutsideClick:false,focusSelector:"#description",keypressListener:N.bind(this.keypressListener,this)};this._pullRequest=S;this._currentReviewerUsers=this._pullRequest.getReviewers();this._opts=J.extend({},T,R);this._dialog=new AJS.Dialog(this._opts);this._dialogEl=J("#"+this._opts.id);this._isDisabled=false;this.initDialog()}G.prototype.keypressListener=function(R){R.stopImmediatePropagation();if(F.isCtrlish(R)&&R.which===J.ui.keyCode.ENTER){R.preventDefault();J(".button-panel-submit-button",this._dialogEl).click()}if(R.keyCode===27&&this._dialogEl.is(":visible")&&!this._isDisabled){P.unbind(this._dialog.getCurrentPanel().body);this.hide()}};G.prototype.initDialog=function(){this._$buttonPanel=this._dialog.addHeader(stash_i18n("stash.web.pull-requests.edit.header","Edit Pull Request")).addPanel(stash_i18n("stash.web.pull-requests.edit.header","Edit Pull Request")).addSubmit(stash_i18n("stash.web.button.save","Save"),N.bind(this.save,this)).addCancel(stash_i18n("stash.web.button.cancel","Cancel"),N.bind(this.cancel,this)).getPage(0).buttonpanel;this._$spinner=J('<div class="spinner"></div>').prependTo(this._$buttonPanel);this.mentionableTextarea=new I({selector:".pull-request-description textarea",$container:this._dialogEl});this.triggerPanelResize=N.bind(this.triggerPanelResize,this)};G.prototype.populatePanelFromPullRequest=function(){this.updatePanel({title:this._pullRequest.getTitle(),description:this._pullRequest.getDescription(),toRef:N.extend({type:A.type.BRANCH},this._pullRequest.getToRef().toJSON()),reviewers:this._currentReviewerUsers.map(function(R){return R.getUser().toJSON()})})};G.prototype.triggerPanelResize=function(){var S=this._dialog.isMaximised();var T=this._dialog.getCurrentPanel().body;var R=T.innerHeight()>=T.get(0).scrollHeight;if(!S||R){N.defer(N.bind(function(){if(this.isVisible()){Q.save();this._dialog.updateHeight();Q.restore()}},this))}};G.prototype.updatePanel=function(T){var S=this._dialog.getCurrentPanel().body;if(T.reviewers.length&&T.reviewers[0].user){T.reviewers=N.pluck(T.reviewers,"user")}S.empty().append(stash.feature.pullRequest.edit(T));this.userSelect=new C(S.find("#reviewers"),{initialItems:T.reviewers,excludedItems:[this._pullRequest.getAuthor().getUser().toJSON()]});var R=S.find("#toRef");this.branchSelector=new M(R,{id:"toRef-dialog",repository:this._pullRequest.getToRef().getRepository(),field:R.next("input")});P.bindTo(S,{callback:this.triggerPanelResize});S.find("textarea.expanding").expandingTextarea({resize:this.triggerPanelResize});this.triggerPanelResize()};function D(R){return{user:R}}G.prototype.getPullRequestUpdateFromForm=function(R){return{title:R.find("#title").val(),description:R.find("#description").val(),reviewers:N.map(this.userSelect.getSelectedItems(),D),toRef:this.branchSelector.getSelectedItem().toJSON(),version:this._pullRequest.getVersion()}};G.prototype.save=function(T,V){if(this._isDisabled){return }var S=this,W=this.getPullRequestUpdateFromForm(V.getCurrentPanel().body.find("form"));if(!W.title){var R=stash_i18n("stash.web.pull-request.edit.no.title","You must supply a title for this pull request.");S.updatePanel(J.extend({fieldErrors:{title:[R]}},W));return }this._$spinner.show().spin("small");S.toggleDisabled(true);var U=L.rest({url:B.rest().currentPullRequest().withParams({avatarSize:stash.widget.avatarSizeInPx({size:"xsmall"})}).build(),type:"PUT",data:W,statusCode:{"400":false,"409":false}});H(U,stash_i18n("stash.web.pull-request.pending.request","You have made changes to the pull request that have not yet reached Stash. If you leave this page, those changes will be lost."));U.done(function(X){window.location.reload()});U.fail(function(d,Y,c,a,b){var e=[],X={},Z;N.each(a.errors,function(f){if(f.context){if(!Object.prototype.hasOwnProperty.call(X,f.context)){X[f.context]=[]}if(f.context===E){X[f.context]=N.pluck(f.reviewerErrors,"message");e.push(f);Z=f.validReviewers}else{X[f.context].push(f.message)}}else{if(f.exceptionName===K){f.message+=" <a href='"+window.location.href.split("#")[0]+"'>"+stash_i18n("stash.web.reload","Reload")+"</a>."}e.push(f)}});S.updatePanel(J.extend({errors:e,fieldErrors:X},W,{reviewers:Z}));S._$spinner.spinStop().hide();S.toggleDisabled(false)})};G.prototype.toggleDisabled=function(R){if(typeof R===undefined){R=!this._isDisabled}this._$buttonPanel.toggleClass("disabled",R);this._$buttonPanel.find("button")[(R)?"attr":"removeAttr"]("disabled","disabled");this._dialog[R?"disable":"enable"]();this._isDisabled=R};G.prototype.cancel=function(){if(!this._isDisabled){P.unbind(this._dialog.getCurrentPanel().body);this.hide()}};G.prototype.isVisible=function(){return this._dialogEl.is(":visible")};G.prototype.show=function(){this.populatePanelFromPullRequest();this._dialog.show();O.on("window.resize.debounced",this.triggerPanelResize)};G.prototype.hide=function(){document.activeElement.blur();this._dialog.hide();O.off("window.resize.debounced",this.triggerPanelResize)};G.prototype.bind=function(R){var S=this;J(document).on("click",R,function(T){T.preventDefault();S.show()})};return G});