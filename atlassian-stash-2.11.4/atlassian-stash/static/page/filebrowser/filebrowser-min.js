define("page/filebrowser",["jquery","aui","util/events","memoir","feature/filebrowser/file-table","feature/filebrowser/file-finder","model/revision-reference","model/path","model/content-tree-node-types","exports"],function(E,G,A,N,D,W,Z,U,J,Y){var L=D.FileTable,F=D.FileTableView,V=W.FileFinder,P;var H,K,I;var O,T,R,C,S,M;function X(){return C.find(".file-row a").map(function(b,d){var a=E(d);var c=a.parent().parent();return{name:a.text(),contentId:a.attr("data-contentId"),type:c.hasClass("file")?J.FILE:c.hasClass("directory")?J.DIRECTORY:J.SUBMODULE}})}Y.onReady=function(i,e,d){var h=new U(i),f=new Z(e);R=E(".find-files");C=E(".filebrowser-content");S=R.find(".find-files-button");M=R.find(".browse-files-button");K=new F(d);H=new L(h,f);I=new V(d,f);E(document).on("focus","#browse-table tr.file-row",function(){E(".focused-file").removeClass("focused-file");E(this).addClass("focused-file")});A.on("memoir.popstate",function(j){if(j.state){f=new Z(j.state.revisionRef)}});var b=function(j){if(f!==j){f=j;A.trigger("stash.page.filebrowser.revisionRefChanged",null,j)}};A.on("stash.layout.branch.revisionRefChanged",b);A.on("stash.feature.filetable.revisionRefChanged",b);A.on("stash.widget.branchselector.dialogShown",function(){P=true});A.on("stash.widget.branchselector.dialogHidden",function(){P=false});var g=function(j){A.trigger("stash.page.filebrowser.urlChanged",null,j)};A.on("stash.layout.*.urlChanged",g);A.on("stash.feature.*.urlChanged",g);A.on("stash.feature.*.pathChanged",function(j){h=j;A.trigger("stash.page.filebrowser.pathChanged",null,h)});A.on("stash.widget.keyboard-shortcuts.register-contexts",function(j){j.enableContext("filebrowser")});var c=function(){if(!I.isLoaded()){S.attr("aria-pressed",true);M.attr("aria-pressed",false);I.loadFinder()}};var a=function(){if(I.isLoaded()){S.attr("aria-pressed",false);M.attr("aria-pressed",true);I.unloadFinder();if(H.data){K.update(H.data)}else{H.reload()}}};A.on("stash.feature.filetable.showFind",c);A.on("stash.feature.filetable.hideFind",a);A.on("stash.page.filebrowser.revisionRefChanged",a);A.trigger("stash.feature.filebrowser.filesChanged",null,{files:X(),path:new U(i),revision:f.getId()});A.on("stash.feature.filetable.dataReceived",function(j){if(B(j)){return }A.trigger("stash.feature.filebrowser.filesChanged",null,{files:j.children.values,path:j.path,revision:j.revision})});S.click(function(){A.trigger("stash.feature.filetable.showFind");return false});M.click(function(){A.trigger("stash.feature.filetable.hideFind");return false});Q()};function B(a){return !(a&&a.children)}function Q(){var a={focusedClass:"focused-file",wrapAround:false,escToCancel:false},b="#browse-table tr.file-row",c=b+"."+a.focusedClass;A.on("stash.keyboard.shortcuts.requestMoveToNextHandler",function(d){(this.moveToNextItem?this:G.whenIType(d)).moveToNextItem(b,a)});A.on("stash.keyboard.shortcuts.requestMoveToPreviousHandler",function(d){(this.moveToPrevItem?this:G.whenIType(d)).moveToPrevItem(b,a)});A.on("stash.keyboard.shortcuts.requestOpenItemHandler",function(d){(this.execute?this:G.whenIType(d)).execute(function(){if(!P){var e=E(c);if(e.length){if(e.hasClass("file")||!N.nativeSupport()){A.trigger("stash.feature.filetable.showSpinner",this);window.location.href=e.find("a").attr("href")}else{e.find("a").click()}}}})});A.on("stash.keyboard.shortcuts.requestOpenParentHandler",function(d){(this.execute?this:G.whenIType(d)).execute(function(){if(!P){var e=E(K.getParentDirSelector());if(e.length){if(N.nativeSupport()){e.click()}else{A.trigger("stash.feature.filetable.showSpinner",this);window.location.href=e.attr("href")}}}})});A.on("stash.keyboard.shortcuts.requestOpenFileFinderHandler",function(d){O=stash_i18n("stash.web.filefinder.findfiles.tooltip","Find files in this repository (Type ''{0}'')",d);S.attr("title",O);(this.execute?this:G.whenIType(d)).execute(function(){A.trigger("stash.feature.filetable.showFind",this)})});A.on("stash.keyboard.shortcuts.requestCloseFileFinderHandler",function(d){T=stash_i18n("stash.web.filefinder.browse.files.tooltip","Browse files in this repository (Type ''{0}'')",d);M.attr("title",T);(this.execute?this:G.whenIType(d)).execute(function(){A.trigger("stash.feature.filetable.hideFind",this)})})}});