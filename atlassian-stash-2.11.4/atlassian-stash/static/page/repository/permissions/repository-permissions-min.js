define("page/repository/permissions",["exports","jquery","util/navbuilder","util/ajax","widget/submit-spinner","feature/permission/permission-table"],function(B,E,F,D,C,A){B.onReady=function(I){var G=E("#public-access-allowed");var K;var H;function J(L){return D.rest({type:"PUT",url:F.rest().currentRepo().build(),data:{"public":L}})}G.click(function(){var L=this.checked;if(!K){K=new C(E(this).next("label"))}if(H){H.abort()}K.show();H=J(L);H.fail(function(){G.prop("checked",!L)}).always(function(){K.hide();H=null})});A.initialise(F.currentRepo().permissions(),I,"REPO_ADMIN")}});