define("feature/comments/comment-container",["jquery","underscore","util/deprecation","util/dom-event","util/events","memoir","util/scroll","model/page-state","feature/comments/comment-model","feature/comments/comment-collection","feature/comments/comment-tips","widget/markup-preview","widget/aui/form","widget/confirm-dialog"],function(E,L,H,D,N,K,F,I,C,B,G,O,A,M){var J=450;return Backbone.View.extend({initialize:function(){L.bindAll(this,"onMarkupPreviewChanged");this.anchor=this.anchor||this.options.anchor;this.rootCommentListSelector=this.rootCommentListSelector||this.options.rootCommentListSelector;this.context=this.options.context;this.pullRequest=this.options.pullRequest||I.getPullRequest();if(!this.collection){this.collection=new B([],{anchor:this.anchor})}this.initDeleteButtons();H.triggerDeprecated("stash.feature.comments.comment-container.added",this.$el,"stash.feature.comments.commentContainerAdded","2.11","3.0");N.trigger("stash.feature.comments.commentContainerAdded",null,this.$el);var P=300;this.updateDraftComment=L.debounce(this.updateDraftComment,P);this.deleteDraftComment=L.debounce(this.deleteDraftComment,P)},events:{"submit form":"onFormSubmit","click a.times":"onDateClicked","click .cancel":"onCancelClicked","click .reply":"onReplyClicked","click .edit":"onEditClicked","keydown textarea":"onTextareaKeydown"},initDeleteButtons:function(P){this.createDeleteDialog().attachTo(".delete",null,this.el)},createDeleteDialog:function(){var P=this;var Q=new M({id:"delete-repository-dialog",titleText:stash_i18n("stash.web.comment.delete.title","Delete comment"),titleClass:"warning-header",panelContent:"<p>"+stash_i18n("stash.web.comment.delete.confirm","Are you sure that you want to delete this comment?")+"</p>",submitText:stash_i18n("stash.web.button.delete","Delete"),submitToHref:false});Q.addConfirmListener(function(T,R,S){S();P.deleteComment(R.closest(".comment"))});return Q},onFormSubmit:function(P){P.preventDefault();P.stopPropagation();this.submitCommentForm(E(P.target))},onDateClicked:function(Q){Q.preventDefault();Q.stopPropagation();E(".comment.focused").removeClass("focused");var P=E(Q.target).closest("a");P.closest(".comment").addClass("focused");K.pushState(null,null,P.prop("href"))},onCancelClicked:function(P){P.preventDefault();P.stopPropagation();this.cancelCommentForm(E(P.target).closest("form"))},onReplyClicked:function(P){P.preventDefault();P.stopPropagation();this.openReplyForm(E(P.target).closest(".comment"))},onEditClicked:function(P){P.preventDefault();P.stopPropagation();this.openEditForm(E(P.target).closest(".comment"))},onTextareaKeydown:function(P){if(D.isCtrlish(P)&&P.which===E.ui.keyCode.ENTER){P.preventDefault();P.stopPropagation();E(P.target).closest("form").submit()}else{if(E(P.target).closest(".comment-container").is(this.el)){this.updateDraftComment(P.target)}}},updateDraftComment:function(Q){var P=this.getDraftCommentFromForm(E(Q).closest("form"));this.context&&this.context.saveDraftComment(P)},getDraftCommentFromForm:function(Q){var P=this.getCommentFormJSON(Q);if(P.anchor){delete P.anchor.commitRange}return E.extend({},P)},deleteDraftComment:function(P){this.context&&this.context.deleteDraftComment(P)},getRootCommentList:function(){var P=this.$(this.rootCommentListSelector);if(!P.length){P=this.$el}return P},render:function(){var P=stash.feature.comments(E.extend({comments:this.collection.toJSON()},this.anchor.toJSON()));this.$el.replaceWith(P);this.setElement(P[0])},_toJSON:function(Q,R){var T=parseInt(Q.parent().closest(".comment").attr("data-id"),10);var S=parseInt(Q.attr("data-id"),10);var P=parseInt(Q.attr("data-version"),10);return{id:!isNaN(S)?S:undefined,version:!isNaN(P)?P:undefined,text:R,anchor:this.anchor.toJSON(),parent:!isNaN(T)?{id:T}:undefined}},getCommentJSON:function(P){return this._toJSON(P,P.find("> .content > .message").attr("data-text"))},getCommentFormJSON:function(P){var Q=P.parent().is(".comment")?P.parent():P;return this._toJSON(Q,P.find("textarea").val())},enableDeletion:function(P){P.find("> .content > .actions > li > .delete").parent().removeClass("hidden")},disableDeletion:function(P){P.find("> .content > .actions > li > .delete").parent().addClass("hidden")},renderContentUpdate:function(P,Q){P.children(".content").replaceWith(stash.feature.commentContent({pullRequest:this.pullRequest&&this.pullRequest.toJSON(),comment:Q,hideDelete:!!P.find("> .replies > .comment").length}));P.attr("data-version",Q.version).data("version",Q.version);this.trigger("change");H.triggerDeprecated("stash.feature.comments.comment.edited",P,Q,this.context,"stash.feature.comments.commentEdited","2.11","3.0");N.trigger("stash.feature.comments.commentEdited",null,Q,P)},insertCommentIntoList:function(R,P,S){var Q=P.children(".comment:first");while(Q.length){if(parseInt(Q.data("id"),10)>S.id){break}Q=Q.next(".comment")}Q=Q.length?Q:P.children(".comment-form-container:last");if(Q.length){R.insertBefore(Q)}else{P.append(R)}},renderComment:function(U,V,R){var Q;if(R&&(Q=E('.comment[data-id="'+U.id+'"]')).length){return this.renderContentUpdate(Q,U)}U=E.extend({isNew:true},U);var T=V&&this.$("[data-id="+V+"]");if(T){this.disableDeletion(T)}var S=(T?T.children(".replies"):this.getRootCommentList());Q=E(stash.feature.comment({pullRequest:this.pullRequest&&this.pullRequest.toJSON(),numOfAncestors:S.parents(".comment").length,extraClasses:this.getExtraCommentClasses(),comment:U}));this.insertCommentIntoList(Q,S,U);var P=5000;setTimeout(L.bind(Q.removeClass,Q,"new"),P);F.scrollTo(Q);Q.hide().fadeIn("slow");this.trigger("change");H.triggerDeprecated("stash.feature.comments.comment.added",Q,U,this.context,"stash.feature.comments.commentAdded","2.11","3.0");N.trigger("stash.feature.comments.commentAdded",null,U,Q)},getExtraCommentClasses:function(){return""},showErrorMessage:function(S,R){var Q=this;var P=Q.find(".error");if(!P.length){P=E('<div class="error"></div>');Q.find(".comment-form-footer").before(P)}P.text(R)},cancelCommentForm:function(P){this.closeCommentForm(P)},submitCommentForm:function(Q){if(A.isSubmissionPrevented(Q)){return }var P=this;var R=Q.find(".comment-submit-spinner");var U=this.getCommentFormJSON(Q);var S=U.id!=null;var T=S&&this.collection.get(U.id);var W=U.parent&&U.parent.id;var V=T?this.collection.get(U.id):new C();V.on("invalid",this.showErrorMessage,Q);if(V.set(E.extend(U,{avatarSize:stash.widget.avatarSizeInPx({size:"medium"})}),{validate:true})){if(!T){this.collection.push(V)}Q.addClass("submitting");R.spin("medium");A.preventSubmission(Q);V.save().done(function(X){X.createdDate=Math.min(X.createdDate,new Date().getTime());X.updatedDate=Math.min(X.updatedDate,new Date().getTime());P.closeCommentForm(Q,{doNotDestroy:true});P.renderComment(X,W,S);P.trigger("comment.saved")}).fail(function(){if(!T&&!S){P.collection.remove(U.id)}}).always(function(){R.spinStop();Q.removeClass("submitting");A.allowSubmission(Q)})}V.off("invalid",this.showErrorMessage)},deleteComment:function(S){var T=this.getCommentJSON(S);var U;if(this.collection.get(T)){U=this.collection.get(T.id)}else{U=new C(T);this.collection.push(U)}var P=S.find("> .content .delete"),R={h:P.height(),w:P.width()};P.height(R.h).width(R.w).css("vertical-align","middle").empty().spin("small");var Q=this;U.destroy({wait:true}).always(function(){P.spinStop()}).done(function(){var W=S.parent().closest(".comment");if(W.length){var V=S.siblings(".comment").length||S.siblings(".comment-form-container").find("textarea").val();if(!V){Q.enableDeletion(W)}}S.fadeOut(function(){S.remove();Q.onCommentDeleted();Q.trigger("change");H.triggerDeprecated("stash.feature.comments.comment.deleted",T,Q.context,"stash.feature.comments.commentDeleted","2.11","3.0");N.trigger("stash.feature.comments.commentDeleted",null,T)})}).fail(function(){P.css("height","").css("width","").css("vertical-align","").text(stash_i18n("stash.web.comment.delete","Delete"))})},onCommentDeleted:function(){},onMarkupPreviewChanged:E.noop,openEditForm:function(R){var S=this.getCommentJSON(R);var P=E(stash.feature.commentForm(E.extend({tips:this.$el.width()>J?G.tips:[],currentUser:I.getCurrentUser()&&I.getCurrentUser().toJSON()},S)));var Q=R.find("> .user-avatar, > .content");Q.remove();R.prepend(P).addClass("comment-form-container");P.data("originalContent",Q);P.find("textarea.expanding").expandingTextarea();L.defer(function(){P.find("textarea").focus()});this.trigger("change");H.triggerDeprecated("stash.feature.comments.comment-form.displayed",P,"stash.feature.comments.commentFormShown","2.11","3.0");N.trigger("stash.feature.comments.commentFormShown",null,P);O.bindTo(P,{callback:this.onMarkupPreviewChanged});return P},openReplyForm:function(Q){var P=Q.children(".replies");return this.openCommentForm(P,{location:"top"})},openNewCommentForm:function(){return this.openCommentForm(this.getRootCommentList(),{location:"bottom"})},openCommentForm:function(P,S){var T=S&&S.location==="top"?"prependTo":"appendTo";var Q=P.children(".comment-form-container").not(".comment");if(!Q.length){Q=E(stash.feature.commentFormListItem({tips:this.$el.width()>J?G.tips:[],currentUser:I.getCurrentUser()&&I.getCurrentUser().toJSON()}))[T](P)}Q.find("textarea.expanding").expandingTextarea();L.defer(function(){Q.find("textarea").focus()});var R=Q.find("form");O.bindTo(R,{callback:this.onMarkupPreviewChanged});this.trigger("change");H.triggerDeprecated("stash.feature.comments.comment-form.displayed",R,"stash.feature.comments.commentFormShown","2.11","3.0");N.trigger("stash.feature.comments.commentFormShown",null,R);return R},closeCommentForm:function(P){P.find(".error").remove();this.deleteDraftComment(this.getDraftCommentFromForm(P));O.unbind(P);var Q=P.data("originalContent");var R=P.parent();if(Q){R.removeClass("comment-form-container");P.replaceWith(Q)}else{R.remove()}this.trigger("change");H.triggerDeprecated("stash.feature.comments.comment-form.closed",P,"stash.feature.comments.commentFormHidden","2.11","3.0");N.trigger("stash.feature.comments.commentFormHidden",null,P)},populateCommentFormFromDraft:function(Q,P){E(Q).find("textarea").val(P.text).addClass("restored").attr("title",stash_i18n("stash.web.comment.restored.draft.title","This comment has been restored from an automatically saved draft.")).trigger("input").one("click keypress",function(){E(this).removeClass("restored").removeAttr("title")})},getCommentElById:function(P){return this.$(".comment[data-id="+P+"]")},restoreDraftComment:function(P){var Q;if(P.id){var R=this.getCommentElById(P.id);if(R.length){if(parseInt(P.version,10)<parseInt(R.attr("data-version"),10)){this.context.deleteDraftComment(P);return true}Q=this.openEditForm(R)}}else{if(P.parent){var S=this.getCommentElById(P.parent.id);if(S.length){Q=this.openReplyForm(S)}}else{Q=this.openNewCommentForm()}}Q&&this.populateCommentFormFromDraft(Q,P);return !!Q},destroy:E.noop})});