define("page/pull-request/view/pull-request-view-commits",["jquery","model/page-state","feature/pull-request/pull-request-commits"],function(C,A,B){return{load:function(D){return B.init({el:D,commitsTableWebSections:A.getPullRequestViewInternal().commitsTableWebSections,pullRequest:A.getPullRequest(),repository:A.getRepository()})},unload:function(D){B.reset();C(D).empty()},keyboardShortcutContexts:["commits"]}});