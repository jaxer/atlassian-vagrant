define("page/project-list",["util/flash-notifications","feature/project/project-table","exports"],function(B,C,A){A.onReady=function(D){B.attachNotifications(".project-banners","before");var E=new C({target:"#"+D});E.init()}});