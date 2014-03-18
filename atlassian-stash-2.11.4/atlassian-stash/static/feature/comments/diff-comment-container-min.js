define("feature/comments/diff-comment-container",["jquery","underscore","util/deprecation","util/events","feature/comments/comment-container"],function(E,A,D,B,C){var F;B.on("memoir.changestate",function(){F=null});return C.extend({rootCommentListSelector:".comment-list",initialize:function(){A.bindAll(this,"onResize");if(!this.$el.is(".comment-container")){this.setElement(E(stash.feature.comments(E.extend({extraClasses:"comment-box",comments:this.options.collection&&this.options.collection.toJSON()},this.options.anchor.toJSON())))[0])}if(!this.isFileCommentContainer()&&this.options.context.diffView){this._widget=this.options.context.diffView.addLineWidget(this.options.lineHandle,this.el,{noHScroll:true,coverGutter:true,insertAt:0});this.options.context.diffView.addLineClass(this.options.lineHandle,"wrap","commented")}this.$el.on("resize.expanding ",this.onResize);this.on("change",this.onResize);this.on("comment.saved",this.scrollIntoView);C.prototype.initialize.apply(this,arguments)},closeCommentForm:function(H,I){if(!I||!I.doNotDestroy){var G=H.parent().parent();if(G.is(this.rootCommentListSelector)&&G.children(".comment").length===0){this.deleteDraftComment(this.getDraftCommentFromForm(H));return this.destroy()}}return C.prototype.closeCommentForm.apply(this,arguments)},destroyIfEmpty:function(){var G=this.$(this.rootCommentListSelector);if(G.children(".comment").length===0&&!G.find("textarea").val()){this.destroy()}},destroy:function(G){F=null;if(this._widget){this._widget.clear();this._widget=null}this.$el.off("resize.expanding",this.onResize);this.off("change",this.onResize);if(this.options.lineHandle){this.options.context.diffView.removeLineClass(this.options.lineHandle,"wrap","commented")}D.triggerDeprecated("stash.comment.comment-container.destroyed",this,"stash.comment.commentContainerDestroyed","2.11","3.0");B.trigger("stash.comment.commentContainerDestroyed",null,this.$el);this.context.destroy(this,G)},onCommentDeleted:function(){this.destroyIfEmpty()},onMarkupPreviewChanged:function(){this.onResize();this.scrollIntoView()},onResize:function(){if(this._widget){this._widget.changed()}this.trigger("resize")},openNewCommentForm:function(){var G=C.prototype.openNewCommentForm.apply(this);this.scrollIntoView();return G},scrollIntoView:function(){if(!this.isFileCommentContainer()){this.options.context.diffView.scrollHandleIntoView(this.options.lineHandle)}},isFileCommentContainer:function(){return !!this.$el.closest(".file-comments").length}})});