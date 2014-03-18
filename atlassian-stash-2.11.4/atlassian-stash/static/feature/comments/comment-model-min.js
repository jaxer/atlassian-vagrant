define("feature/comments/comment-model",["backbone","backbone-brace","underscore","util/navbuilder"],function(E,C,B,A){var D=C.Model.extend({namedAttributes:{anchor:null,author:null,avatarSize:null,comments:null,createdDate:"number",html:"string",id:"number",isFocused:"boolean",isUnread:"boolean",parent:null,permittedOperations:null,text:"string",updatedDate:"number",version:"number"},validate:function(F){if(!F.text||!/\S/.test(F.text)){return stash_i18n("stash.web.comment.empty","Please enter some text")}},url:function(){var H=A.parse(C.Model.prototype.url.apply(this,arguments));var F=this.get("anchor");if(F&&F.commitRange){var G=F.commitRange.sinceRevision;if(G){H.addQueryParam("since",G.id)}}H.addQueryParam("version",this.get("version")).addQueryParam("avatarSize",this.get("avatarSize")).addQueryParam("markup",true);return H.toString()},forEachCommentInThread:function(F){F(this);B.each(this.get("comments"),function(G){G.forEachCommentInThread(F)})},sync:function(H,G,F){return E.sync(H,G,B.extend(F,{statusCode:{"404":function(N,I,M,K,L){var J=K&&K.errors&&K.errors.length&&K.errors[0];if(J&&J.message&&/comment/i.test(J.message)){if(H==="create"&&G.get("parent")!=null){return{title:stash_i18n("stash.web.comment.notfound","Comment not found"),message:stash_i18n("stash.web.comment.reply.parent.notfound.message","The comment you are replying to no longer exists."),shouldReload:true,fallbackUrl:undefined}}else{if(H==="update"){return{title:stash_i18n("stash.web.comment.notfound","Comment not found"),message:stash_i18n("stash.web.comment.update.notfound.message","The comment you are updating no longer exists."),shouldReload:true,fallbackUrl:undefined}}}}}}}))}});C.Mixins.applyMixin(D,{namedAttributes:{comments:[D]}});return D});