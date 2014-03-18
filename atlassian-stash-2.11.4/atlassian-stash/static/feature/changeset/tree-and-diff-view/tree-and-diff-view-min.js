define("feature/changeset/tree-and-diff-view",["jquery","util/events","underscore","util/deprecation","model/conflict","model/file-change","model/file-content-modes","model/page-state","model/path","feature/changeset/difftree","feature/file-content","exports"],function(i,a,AB,Y,A,Z,m,V,j,I,X,t){var f=I.DiffTree,u="ROOT";var y;var c,D,w=false;var H,q={},T;var v=i(window),N,B,F,U,z,E,P,K,O,AA,r,n;function AC(AD){var AM=d(AD),AF=C(AD),AL=J(AD),AG=o(AD),AH=s(AD),AK=l(AD),AJ=e(AD);if(!T){T=new X(F,"changeset-file-content")}var AI=new Z({repository:V.getRepository(),commitRange:c,srcPath:AF,path:AM,type:AL,nodeType:AG,conflict:AH,srcExecutable:AJ,executable:AK});D=AM;F.height(F.height());var AE=v.scrollTop();return T.init(AI,null,null,y).done(function(){P=i("#changeset-file-content");if(P.length===0){return }n=P.find(".file-toolbar");r=P.find(".content-view");AE=k(AE);v.scrollTop(AE)})}function W(){var AD=i.Deferred();D=null;if(T){T.destroy();T=null}i("#changeset-file-content").remove();return AD.resolve()}function d(AD){return new j(AD.data("path"))}function J(AD){return AD.data("changeType")}function o(AD){return AD.data("nodeType")}function C(AD){return new j(AD.data("srcPath"))}function s(AD){return AD.data("conflict")&&new A(AD.data("conflict"))}function e(AD){return AD.data("srcExecutable")}function l(AD){return AD.data("executable")}function M(){z=v.height();E=z-i(".diff-tree-toolbar").outerHeight();O.css({"max-height":E+"px","border-bottom-width":0})}function k(AE){var AD=P.offset();if(AD){return Math.min(AE,AD.top)}return AE}a.on("stash.feature.diffview.optionsChanged",AB.partial(g,true));function g(AG){w=true;var AF=L();var AE=(Boolean(AF)^Boolean(D))||(AF&&AF.toString()!==D.toString());if((AE||AG===true)&&H){H.selectFile(AF.getComponents());var AD=H.getSelectedFile();if(AD&&AD.length>0){AC(AD)}}w=false}function p(AD){if(!U){U=i("<div class='spinner'/>")}U.appendTo("#content .file-tree-wrapper").spin("large");return H.init(AD).always(function(){if(U){U.spinStop().remove();U=null}}).done(function(){AA=i(".file-tree");E=z-i(".diff-tree-toolbar").outerHeight();O.css("max-height",E)})}function L(){return new j(window.location.hash.substring(1))}var x;function S(){var AF=i(".collapse-file-tree");var AH=i(".changeset-files");var AE=i(".file-tree-container");var AD=AE.find(".aui-toolbar2-primary");var AJ;function AI(){a.trigger("stash.feature.changeset.difftree.collapseAnimationFinished",null,AJ)}AE.on("transitionend webkitTransitionEnd",AI);var AG=(i.browser.msie&&parseInt(i.browser.version,10)<=9)?AB.debounce(AI,0):i.noop;x=function(){if(i.browser.msie&&parseInt(i.browser.version,10)<=9){AD.toggle()}else{AD.fadeToggle()}AH.toggleClass("collapsed");AJ=AH.hasClass("collapsed");a.trigger("stash.feature.changeset.difftree.toggleCollapse",null,AJ);AG()};AF.on("click",function(AK){AK.preventDefault();x()})}function R(){i(".no-changes-placeholder").remove();var AD=D?D:L();return p(AD.getComponents()).then(function(AF){var AE=AF.getSelectedFile();if(AE&&AE.length){return AC(AE)}else{return W().done(function(){i(".changeset-files").append(i("<div class='message no-changes-placeholder'></div>").text(stash_i18n("stash.web.no.changes.to.show","No changes to show")))})}})}t.updateCommitRange=function(AD){if(AD.getId()===c.getId()){return }c=AD;H.reset();if(Object.prototype.hasOwnProperty.call(q,c.getId())){H=q[c.getId()]}else{H=new f(".file-tree-wrapper",c,{maxChanges:y.maxChanges,hasOtherParents:y.numberOfParents>1});q[c.getId()]=H}R()};function G(AD,AE){if(!w&&!AE){window.location.hash=AD?d(AD).toString():""}}function b(AD){if(i.browser.msie&&parseInt(i.browser.version,10)===9){return }(this.execute?this:AJS.whenIType(AD)).execute(x)}function h(AD){(this.execute?this:AJS.whenIType(AD)).execute(function(){H.openNextFile()})}function Q(AD){(this.execute?this:AJS.whenIType(AD)).execute(function(){H.openPrevFile()})}t.init=function(AD,AE){y=i.extend({},t.defaults,AE);N=i("#footer");B=i("#content");F=B.find(".changeset-files");K=i(".file-tree-container");O=K.children(".file-tree-wrapper");z=v.height();P=i("#changeset-file-content");c=AD;H=new f(".file-tree-wrapper",c,{maxChanges:y.maxChanges,hasOtherParents:y.numberOfParents>1});q[c.getId()]=H;D=L();v.on("hashchange",g);a.on("window.resize",M);a.on("stash.feature.fileContent.diffViewExpanded",M);a.on("stash.feature.changeset.difftree.selectedNodeChanged",G);S();R();a.on("stash.keyboard.shortcuts.requestToggleDiffTreeHandler",b);a.on("stash.keyboard.shortcuts.requestMoveToNextHandler",h);a.on("stash.keyboard.shortcuts.requestMoveToPreviousHandler",Q)};t.reset=function(){if(H){H.reset()}c=undefined;H=undefined;q={};D=undefined;v.off("hashchange",g);a.off("window.resize",M);a.off("stash.feature.fileContent.diffViewExpanded",M);a.off("stash.feature.changeset.difftree.selectedNodeChanged",G);a.off("stash.keyboard.shortcuts.requestToggleDiffTreeHandler",b);a.off("stash.keyboard.shortcuts.requestMoveToNextHandler",h);a.off("stash.keyboard.shortcuts.requestMoveToPreviousHandler",Q);return W()};t.onReady=Y.fn(t.init,"feature/changeset/tree-and-diff-view::onReady","feature/changeset/tree-and-diff-view::init","2.0","3.0");t.defaults={breadcrumbs:true,sourceLink:true,changeTypeLozenge:true,changeModeLozenge:true,contentMode:m.DIFF,toolbarWebFragmentLocationPrimary:null,toolbarWebFragmentLocationSecondary:null};t.commentMode=X.commentMode});