define("page/admin/userEdit",["aui","jquery","underscore","util/ajax","util/error","util/flash-notifications","util/navbuilder","widget/delete-dialog","widget/confirm-dialog","widget/submit-spinner","feature/user/user-groups-table","exports"],function(H,D,V,N,F,S,T,Q,G,A,B,W){function J(X){var Y=D(".content-body .notifications");Y.empty().html(X)}function P(X){J(widget.aui.message.success({content:X}))}function E(X,Y){D(X).parent(".field-group").append(D("<span class='error'></span>").text(Y))}function R(){D(".panel-details .error, .content-body .notifications > .error").remove()}function O(X){if(V.isArray(X)){V.each(X,function(Y){if(Y.message&&Y.context&&Y.context==="email"){E("#email",Y.message)}else{if(Y.message&&Y.context&&Y.context==="displayName"){E("#fullname",Y.message)}else{if(Y.message){J(widget.aui.message.error({content:H.escapeHtml(Y.message)}))}else{J(widget.aui.message.error({content:H.escapeHtml(Y)}))}}}})}else{if(V.isString(X)){J(widget.aui.message.error({content:H.escapeHtml(X)}))}}}function C(X){Q.bind(X,stash_i18n("stash.web.users.delete","Delete user"),stash_i18n("stash.web.users.delete.success","The user {0} was successfully deleted."),stash_i18n("stash.web.users.delete.fail","The user could not be deleted."),function(Y){S.addNotification(stash_i18n("stash.web.users.delete.success","The user {0} was successfully deleted.",Y));window.location=T.admin().users().build();return false},function(){return D("#fullname").val()})}function M(X){var Z=D(stash.admin.users.clearCaptchaDialog({displayName:D("#fullname").val()}));var Y=new G({id:"clear-captcha-dialog",titleText:stash_i18n("stash.web.users.captcha.clear","Clear CAPTCHA challenge"),panelContent:Z,submitText:stash_i18n("stash.web.button.clear","Clear")},{type:"DELETE"});Y.attachTo(X);Y.addConfirmListener(function(a){a.done(function(){D(X).remove();Y.destroy();P(stash_i18n("stash.web.users.captcha.cleared","CAPTCHA challenge cleared."))})})}function U(Y,X){D(X).click(function(b){b.preventDefault();var Z=D(stash.admin.users.passwordResetForm({}));var a=new H.Dialog({width:433,id:"change-password-dialog",closeOnOutsideClick:false,keypressListener:function(c){c.stopImmediatePropagation();if(c.keyCode===D.ui.keyCode.ENTER){c.preventDefault();D(this).find(".button-panel-submit-button").click()}else{if(c.keyCode===D.ui.keyCode.ESCAPE){c.preventDefault();a.remove()}}}});a.addHeader(H.escapeHtml(stash_i18n("stash.web.users.change.password.dialog","Change the password for {0}",Y)));a.addPanel("content",Z);a.addSubmit(stash_i18n("stash.web.button.save","Save"),function(c){var e=new A(D(c.getPage(0).buttonpanel).find(".button-panel-submit-button"),"before").show();c.disable();var d=c.getPage(0).buttonpanel;d.addClass("disabled");N.rest({url:Z.attr("action"),type:"PUT",data:V.extend({name:Y},N.formToJSON(Z)),statusCode:{"*":function(){return false}}}).always(function(){e.remove()}).done(function(){c.remove();P(stash_i18n("stash.web.users.password.update.success","Password successfully updated."))}).fail(function(h,i,g,f){c.enable();d.removeClass("disabled");F.setFormErrors(Z,(f&&f.errors&&f.errors[0]&&f.errors[0].message)?f.errors:[{message:stash_i18n("stash.web.users.change.password.failure","The password could not be changed.")}]);c.updateHeight()})});a.addCancel(stash_i18n("stash.web.button.cancel","Cancel"),function(c){c.remove()});a.show();a.updateHeight()})}function I(Y,X){D(X).click(function(b){b.preventDefault();var Z=D(stash.admin.users.renameUserForm({}));var a=new H.Dialog({width:433,id:"rename-user-dialog",closeOnOutsideClick:false,keypressListener:function(c){c.stopImmediatePropagation();if(c.keyCode===D.ui.keyCode.ENTER){c.preventDefault();D(this).find(".button-panel-submit-button").click()}else{if(c.keyCode===D.ui.keyCode.ESCAPE){c.preventDefault();a.remove()}}}});a.addHeader(stash_i18n("stash.web.users.rename.user.dialog","Rename {0}",Y));a.addPanel("content",Z);a.addSubmit(stash_i18n("stash.web.button.save","Save"),function(c){var e=new A(D(".button-panel-submit-button",c.getPage(0).buttonpanel),"before").show();c.disable();var d=c.getPage(0).buttonpanel;d.addClass("disabled");N.rest({url:Z.attr("action"),type:"POST",data:V.extend({name:Y},N.formToJSON(Z)),statusCode:{"*":function(){return false}}}).always(function(){e.remove()}).done(function(f){S.addNotification(stash_i18n("stash.web.users.rename.success","User successfully renamed."));location.href=T.admin().users().view(f.name).build()}).fail(function(h,i,g,f){c.enable();d.removeClass("disabled");F.setFormErrors(Z,(f&&f.errors&&f.errors[0]&&f.errors[0].message)?f.errors:[{message:stash_i18n("stash.web.users.rename.failure","The user could not be renamed.")}]);c.updateHeight()})});a.addCancel(stash_i18n("stash.web.button.cancel","Cancel"),function(c){c.remove()});a.show();a.updateHeight()})}function K(){function X(a){a.find("input[type=text]").each(function(){var b=D(this);b.val(b.data("rollback"))})}function Y(a,b){a.find("#fullname").val(b.displayName);a.find("#email").val(b.emailAddress);a.find("input[type=text]").each(function(){var c=D(this);c.data("rollback",c.val())})}function Z(a){a.removeClass("editing").find("#fullname, #email").attr("readonly","readonly");D("#ajax-status-message").empty();R()}D("#edit-details").click(function(a){D(".panel-details form.editable").addClass("editing").find("#fullname, #email").removeAttr("readonly");if(a.target.id!=="email"){D("#fullname",".panel-details form.editable").focus()}a.preventDefault()});D(".panel-details form.editable").keyup(function(a){if(a.which===D.ui.keyCode.ENTER){D(".save",this).click()}else{if(a.which===D.ui.keyCode.ESCAPE){D("a.cancel",this).click()}}});D(".cancel",".panel-details form.editable").click(function(b){b.preventDefault();var a=D(this).parents("form");X(a);Z(a);return false});D(".save",".panel-details form.editable").click(function(c){c.preventDefault();R();var b=D(this).parents("form");var a=b.find("#fullname").val();N.rest({url:b.attr("action"),type:"PUT",data:{name:b.find("#name").val(),displayName:a,email:b.find("#email").val()},statusCode:{"500":function(){return false},"404":function(){return false},"401":function(){return false},"400":function(){return false}}}).done(function(d){Y(b,d);Z(b);P(stash_i18n("stash.web.users.update.success","{0}{1}{2} was successfully updated.","<strong>",H.escapeHtml(a),"</strong>"))}).fail(function(f,h,e,d){var g=(d&&d.errors)?d.errors:stash_i18n("stash.web.users.update.failure","The user could not be updated.");O(g)})})}function L(X){var Y=new B({target:X,onError:O});Y.init()}W.onReady=function(Y,X){S.attachNotifications(".content-body .notifications","html");C(X.deleteLinkSelector);M(X.clearCaptchaLinkSelector);U(Y,X.passwordLinkSelector);I(Y,X.renameUserLinkSelector);K();L(X.groupsTableSelector);D(document).ready(function(){if(location.hash){D('.menu-item > a[href="'+location.hash+'"]').click()}})}});