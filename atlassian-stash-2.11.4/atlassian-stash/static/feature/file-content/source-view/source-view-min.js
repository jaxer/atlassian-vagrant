define("feature/file-content/source-view",["jquery","underscore","util/events","aui","util/dom-event","util/ajax","util/error","util/function","util/navbuilder","util/html","util/promise","model/file-change","model/file-content-modes","widget/paged-scrollable","widget/loaded-range","feature/file-content/binary-view","feature/file-content/file-blame","feature/file-content/determine-language"],function(I,f,C,M,h,T,L,N,c,Z,V,Q,E,K,P,F,d,O){h.listenForFontSizeChange();var G=I.browser.msie&&parseInt(I.browser.version,10)<9,D=I.browser.msie&&parseInt(I.browser.version,10)<9,Y=D?"<br /></pre>":"<br />",R='<span title="'+stash_i18n("stash.web.source.line.truncated","This line has been truncated.")+'">&hellip;</span>'+Y,H={lineStart:D?"<pre>":"",lineEnd:function(i){return i.truncated?R:Y},emptyLine:""},U=I.browser.msie&&Math.floor(parseInt(I.browser.version,10))===9,e=I.browser.msie?1000:5000,J=20000;function S(k,j,l){var i=c.currentRepo().browse().path(k).at(j.getDisplayId()).build();return T.rest({url:i,data:l,statusCode:T.ignore404WithinRepository(function(m){return I.Deferred().resolve(m)})})}var a="text";function g(i){var j=M.escapeHtml(i.text);return H.lineStart+(j||H.emptyLine)+H.lineEnd(i)}function X(i){return f.map(i,g).join("")}function W(n,m){var l="";for(var k=n,j=n+m;k<j;k++){l+='<pre id="l'+k+'"><a href="#'+k+'">'+k+"</a></pre>"}return l}function B(l,j){K.call(this,j.$scrollPane,{pageSize:e,dataLoadedEvent:"stash.feature.sourceview.dataLoaded"});var i=new Q(j.fileChange);this.$table=I(j.$container);this.$linesContainer=this.$table.children(".line-numbers");this.$linesBlock=this.$linesContainer.children(".numbers");this.$sourceBlock=this.$table.find(".code");this.$source=I("<code />").appendTo(this.$sourceBlock);var k=this.$table.closest(".file-content").find(".file-blame");this.blame=new d(k,this.$table,i.getPath(),i.getCommitRange().getUntilRevision());this.$viewRaw=I(".raw-view-link");this.scrollbarPadding=0;if(U){this.$table.addClass("padded-scrollbar");this.scrollbarPadding=parseInt(this.$linesBlock.css("padding-bottom"),10)}this.initialData=l;this.init(i,j)}I.extend(B.prototype,K.prototype);B.prototype.init=function(i,k){var l=k&&k.targetLine;this.fileChange=i;this.startingLine=l!=null?Math.min(l+1,J):null;var j=this;this.includeBlame=function(m){if(this===j.blame){j.includeBlame=m}};C.on("stash.feature.fileblame.enabledStateChanged",this.includeBlame);return K.prototype.init.call(this,{targetedItem:l,loadedRange:new P(J)})};function b(i){while(i.hasChildNodes()){i.removeChild(i.firstChild)}}B.prototype.reset=function(){this.startingLine=0;this.fileChange=undefined;this.language=undefined;this.blame=undefined;this.$viewRaw=undefined;b(this.$linesBlock[0]);b(this.$source[0]);this.fontSizeHandler&&C.off("stash.util.events.fontSizeChanged",this.fontSizeHandler);C.off("stash.feature.fileblame.enabledStateChanged",this.includeBlame);C.off("stash.page.source.requestedRevisionData",this.onRequestedRevisionData);this.$linesBlock.off("click.source-view","a");K.prototype.reset.call(this)};B.prototype.destroy=function(){this.reset();if(this.$overCapacityMessage){this.$overCapacityMessage.remove();this.$overCapacityMessage=null}};B.prototype.requestData=function(k,i){if(k===0&&this.initialData){try{if(this.initialData.errors){return I.Deferred().rejectWith(this,[this,null,null,this.initialData])}return I.Deferred().resolve(this.initialData)}finally{this.initialData=null}}var j=I("<div />").addClass("file-content-spinner").appendTo(I(".source-view"));return V.spinner(j,A(this.fileChange,this.includeBlame,k,i),"large")};function A(i,l,m,j){var k={start:m,limit:j};if(l){k.blame=true}return S(i.getPath(),i.getCommitRange().getUntilRevision(),k)}B.prototype.disableBlame=function(){this.blame.setButtonEnabled(false);this.blame.setEnabled(false)};B.prototype.handleErrors=function(i){if(i){this.$source.prepend(f.reduce(i,function(j,k){var m=k&&k.message||stash_i18n("stash.web.source.error.unknown","Source could not be loaded");var l=widget.aui.message.warning({content:M.escapeHtml(m)});return j+l},""));C.trigger("stash.feature.sourceview.onError",this,{errors:i});this.disableBlame();this.$viewRaw.attr("disabled",true)}};B.prototype.onBinary=function(i){var j=this.$table.find(".binary-container");F.renderBinaryFile(I("<div>"),i.path,this.fileChange.getCommitRange()).appendTo(j);C.trigger("stash.feature.sourceview.onBinary",this,{path:i.path});this.disableBlame()};B.prototype.onEmptyFile=function(i){this.$table.addClass("empty-file").html(stash.feature.fileContent.emptyFile());C.trigger("stash.feature.sourceview.onEmptyFile",this,i);this.disableBlame()};B.prototype.onDataLoaded=function(l,i,k){if(k.errors){this.handleErrors(k.errors);return }var j=this;if(F.shouldRenderBinary(k)){this.$table.find(".source-container, .line-numbers").hide().end().find(".binary-container").show();this.onBinary(k)}else{if(k.lines&&k.lines.length===0){this.$table.find(".source-container, .line-numbers").show().end().find(".binary-container").hide().empty();this.onEmptyFile(k)}else{this.blame.setButtonEnabled(true);this.$viewRaw.attr("disabled",false);K.prototype.onDataLoaded.call(this,l,i,k);this.blame.onDataLoaded(l,i,k)}}if(j.loadedRange.reachedEnd()||k.binary){j.$table.addClass("fully-loaded");if(j.loadedRange.reachedCapacity()&&!j.$overCapacityMessage){j.$overCapacityMessage=I(widget.aui.message.warning({content:stash_i18n("stash.web.source.overcapacity",'This file is too large to render. <a href="{0}">Download the full file</a>.',c.currentRepo().browse().path(j.fileChange.getPath()).at(j.fileChange.getUntilRevision().getId()).raw().build())}));j.$table.after(j.$overCapacityMessage)}}};B.prototype.attachNewContent=function(m,l){var n=this.language=this.language||(G?a:O.fromFileInfo({firstLine:m.lines[0].text,path:this.fileChange.getPath().toString(),legacy:true})||a);var i;if(n===a){i=X(m.lines)}else{var k=f.map(m.lines,N.dot("text")).join("\n")+"\n",j=hljs.highlight(n,k).value;i=Z.mergeStreams(k,Z.lineNodeStream(m.lines,null,H),Z.highlightJsNodeStream(j)).replace(/\n/g,"")}Z.quickNDirtyAttach(this.$source[0],i,l);if(l==="prepend"){this._resizePlaceholder()}Z.quickNDirtyAttach(this.$linesBlock[0],W(Number(m.start)+1,Number(m.size)),l)};B.prototype._resizePlaceholder=function(){var l=this,j=l.loadedRange.start,i=l.loadedRange.nextPageStart;if(j>0){var n=l.$linesBlock[0],k=l.scrollbarPadding,m;if(!(m=l.$precedingSourcePlaceholder)){m=l.$precedingSourcePlaceholder=I("<div/>").prependTo(l.$sourceBlock).add(I("<div/>").prependTo(l.$linesContainer))}m.height(0);m.height(((n.offsetHeight-k)/(i-j))*j);m.addClass("source-placeholder")}else{if(l.$precedingSourcePlaceholder){l.$precedingSourcePlaceholder.remove();l.$precedingSourcePlaceholder=null}}};B.prototype.onFirstDataLoaded=function(n,j,l){var k=this;if(n>0){this._resizePlaceholder()}C.on("stash.util.events.fontSizeChanged",this.fontSizeHandler=function(){k._resizePlaceholder()});if(this.startingLine){this.selectLine(this.startingLine,true)}this.$linesBlock.on("click.source-view","a",function(){var o=this.parentNode.id.match(/\d+/)[0];C.trigger("stash.feature.sourceview.selectedLineChanged",k,o);k.selectLine(o)});if(G&&l.lines.length){var m=O.fromFileInfo({firstLine:l.lines[0].text,path:k.fileChange.getPath().toString(),legacy:true})||a;if(m!==a){var i=I(stash.feature.fileContent.syntaxHighlightToolbarWarning()).appendTo(".file-toolbar .primary");new M.InlineDialog(i.find(".dialog-trigger"),"highlight-demo",function(p,o,r){var q=I('<div class="syntax-highlight-warning-dialog"></div>');q.html(stash_i18n("stash.web.sourceview.warning.nosyntaxhighlight.detail","Syntax highlighting is not supported in Internet Explorer 8. For a better experience, consider {0}upgrading your browser{1}.",'<a href="http://www.browseryoulovedtohate.com" target="_blank">',"</a>"));p.html(q);r()},{hideDelay:500,width:350})}}K.prototype.onFirstDataLoaded.call(this)};B.prototype.selectLine=function(i,j){var k=this.$lineLink;if(k){k.removeClass("target")}if(i){k=this.$lineLink=this.$linesBlock.find("#l"+i);if(k.length){this.$scrollElement.scrollTop(k.offset().top-(I(window).height()/4));k.addClass("target");if(j){k.addClass("initial-target")}}}};B.fileHandler=function(i){var j=i.contentMode===E.SOURCE;return j&&A(new Q(i.fileChange),false,0,e).then(function(k){return new B(k,i)},function(n,m,l,k){if(k&&k.errors&&L.isErrorEntityWithinRepository(k.errors[0])){return I.Deferred().resolve(new B(k,i))}return I.Deferred().rejectWith(this,arguments)})};return B});require("stash/api/feature/files/file-handlers").register({weight:10000,extraClasses:"source-file-content",handle:function(A){return require("feature/file-content/source-view").fileHandler.apply(this,arguments)}});