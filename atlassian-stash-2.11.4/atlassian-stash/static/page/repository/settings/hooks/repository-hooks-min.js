define("page/repository/hooks",["exports","jquery","aui","model/repository-hook","feature/repository/hook-list"],function(B,E,A,D,C){B.onReady=function(J,H){var I=new C({el:E("#pre-receive-hook-table")[0],hookType:"PRE_RECEIVE",collection:new D.Collection(J.values)});var G=new C({el:E("#post-receive-hook-table")[0],hookType:"POST_RECEIVE",collection:new D.Collection(H.values)});var F=A.InlineDialog(E(".add-hook-button"),1,function(L,K,M){L.html(stash.feature.repository.hookAddDialog());L.find(".cancel").click(function(N){N.preventDefault();F.hide()});M()})}});