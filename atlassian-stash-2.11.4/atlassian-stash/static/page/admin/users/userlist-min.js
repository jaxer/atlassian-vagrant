define("page/admin/usersList",["util/flash-notifications","widget/delete-dialog","feature/user/user-table","exports"],function(B,D,C,A){A.onReady=function(F,G){B.attachNotifications(".content-body .notifications");var E=new C({target:F});E.init();D.bind(G,stash_i18n("stash.web.users.delete","Delete user"),stash_i18n("stash.web.users.delete.success","The user {0} was successfully deleted."),stash_i18n("stash.web.users.delete.fail","The user could not be deleted."),function(H){B.addNotification(stash_i18n("stash.web.users.delete.success","The user {0} was successfully deleted.",H));location.reload()})}});