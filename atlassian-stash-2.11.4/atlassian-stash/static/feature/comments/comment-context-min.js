define("feature/comments/comment-context",["jquery","underscore","util/deprecation","util/events","backbone","util/client-storage","widget/mentionable-textarea","feature/comments/comment-container"],function(G,B,F,C,H,A,D,E){return H.View.extend({initialize:function(){this._containers={};this.checkForNewContainers();var I=this;C.on("stash.feature.comments.commentAdded",this._commentAddedHandler=function(K,L){if(I.$el.find(L).length&&I.$el.find(".comment").length===1){F.triggerDeprecated("stash.feature.comments.first.comment.added",I,I,"stash.feature.comments.firstCommentAdded","2.11","3.0");C.trigger("stash.feature.comments.firstCommentAdded",null,I.$el)}});this.mentionableTextarea=new D({selector:this.mentionableTextareaSelector,$container:this.$el});var J=this.getDrafts()||[];this.unrestoredDrafts=this.drafts=B.isArray(J)?J:[J];this.restoreDrafts()},mentionableTextareaSelector:".comment-form-container textarea",includesContainer:function(I){return B.has(this._containers,I)},registerContainer:function(K,J){var I=J.getId();if(!this.includesContainer(I)){this._registerContainer(I,K,J)}},_registerContainer:function(J,K,I){this._containers[J]=new E({name:J,context:this,el:K,anchor:I});return this._containers[J]},checkForNewContainers:function(){var I=this;B.forEach(this.findContainerElements(),function(J){I.registerContainer(J,I.getAnchor(J))})},findContainerElements:function(){return this.$(".comment-container")},getAnchor:function(){return this.options.anchor},clarifyAmbiguousDraftProps:function(I){return B.omit(I,"text")},deleteDraftComment:function(I,K){K=B.isBoolean(K)?K:true;var J=B.isEqual.bind(B,this.clarifyAmbiguousDraftProps(I));this.drafts=B.reject(this.drafts,B.compose(J,this.clarifyAmbiguousDraftProps.bind(this)));if(K){this.saveDraftComments()}},getDrafts:function(){return A.getSessionItem(this.getDraftsKey())},getDraftsKey:function(){return A.buildKey(["draft-comment",this.options.anchor.getId()],"user")},restoreDrafts:G.noop,saveDraftComment:function(I){this.deleteDraftComment(I,false);I.text&&this.drafts.push(I);this.saveDraftComments()},saveDraftComments:function(){A.setSessionItem(this.getDraftsKey(),this.drafts)},destroy:function(I,J){if(I){I.remove();delete this._containers[I.options.name];if(!this.$el.has(".comment").length&&!J){F.triggerDeprecated("stash.feature.comments.last.comment.deleted",this,this,"stash.feature.comments.lastCommentDeleted","2.11","3.0");C.trigger("stash.feature.comments.lastCommentDeleted",null,this.$el)}}else{J=true;B.invoke(this._containers,"remove");B.invoke(this._containers,"destroy",J);this._containers=null;if(this._commentAddedHandler){C.off("stash.feature.comments.commentAdded",this._commentAddedHandler);delete this._commentAddedHandler}if(this.mentionableTextarea){this.mentionableTextarea.destroy();delete this.mentionableTextarea}}}})});