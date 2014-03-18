define("page/admin/mailServer",["jquery","util/flash-notifications","widget/confirm-dialog","exports"],function(D,C,B,A){A.onReady=function(J,I,G){C.attachNotifications(D(".stash-mailserver-form"),"before");var E=D(I);E.click(function(){var L=D(this),K=D("<div class='spinner'></div>");L.nextAll().remove();L.after(K);K.spin()});D(G).keypress(function(K){if(K.which===13){K.preventDefault();E.click()}});var H=stash.widget.paragraph({text:stash_i18n("stash.web.mailserver.delete.confirm","Are you sure that you want to remove the mail server configuration?")});var F=new B({id:"delete-mail-sever-config-dialog",titleText:stash_i18n("stash.web.mailserver.delete.config","Delete the mail server configuration"),titleClass:"warning-header",panelContent:H,submitText:stash_i18n("stash.web.button.delete","Delete")},{type:"DELETE"});F.attachTo(J);F.addConfirmListener(function(K){K.done(function(L){C.addNotification(stash_i18n("stash.web.config.mail.deleted","The mail server configuration was deleted"),"info");window.location.reload()})})}});