define("feature/file-content/diff-view",["bacon","codemirror","jquery","underscore","model/file-change","util/bacon","util/events","util/function","util/object","util/performance","util/scroll","util/region-scroll-forwarder","util/request-page-scrolling","feature/file-content/diff-view-segment-types","feature/file-content/ediff/ediff-markers"],function(n,S,d,q,W,l,X,c,C,P,Y,b,o,g,G){var A=g.ADDED;var p=g.REMOVED;var T=g.CONTEXT;function D(r,u,t,v,s){this.line=r;this.segment=u;this.hunk=t;this.diff=v;this.handles={FROM:null,TO:null};this.attributes=s}D.prototype._setHandle=function(r,s){this.handles[r]=s};var j={ADDED:"destination",REMOVED:"source",CONTEXT:"source"};function K(w,u,t,r){var v=w[t-1];var x=w[t+1];if(u.type!==g.CONTEXT){return null}var y=0;var s=u.lines.length;if(v&&(v.type===g.ADDED||v.type===g.REMOVED)){y=r}if(x&&(x.type===g.ADDED||x.type===g.REMOVED)){s=s-r}if(s>y){return{start:y-1,end:s}}return null}function F(s,r){return q.chain(s.hunks).map(function(t){return q.map(t.segments,function(w,v){var u=K(t.segments,w,v,r.relevantContextLines);return{hunk:t,segment:w,expandedRange:u}})}).flatten().map(function(u){var t=u.segment;return q.map(t.lines,function(v,x){v.lineType=t.type;v.lineNumber=v[j[t.type]];var w={expanded:u.expandedRange&&x<u.expandedRange.end&&x>u.expandedRange.start};return new D(v,t,u.hunk,s,w)})}).flatten().value()}var H=d('<div class="line-number"></div>');var a=d('<div class="line-number-marker" data-file-type="" data-line-type="" data-line-number=""></div>');function O(r,s){s.eachLine(function(y){var v=y.line;var w=y.handles.FROM;var t=y.handles.TO;var x=H.clone();var u=H.clone();x.addClass("line-number-from");u.addClass("line-number-to");x.html(v.lineType!==A?v.source:"&nbsp;");u.html(v.lineType!==p?v.destination:"&nbsp;");r.setGutterMarker(w||t,"line-number-from",x[0]);r.setGutterMarker(t||w,"line-number-to",u[0]);q.chain([w,t]).compact().uniq().forEach(function(AA){var z=a.clone();z.attr("data-file-type",AA.fileType);z.attr("data-line-type",v.lineType);z.attr("data-line-number",v.lineNumber);z.html(AA.lineType===A?"+":AA.lineType===p?"-":"&nbsp;");r.setGutterMarker(AA,"line-number-marker",z[0])})}).done(function(){var t=Z(s);h(t);if(s.type==="INITIAL"){m(t)}})}var E={};E[A]="added";E[p]="removed";E[T]="context";function L(u,t,s,v){var r="line "+E[u];if(u!==T){r+=" modified"}if(v===true||s===true){r+=" expanded"}r+=(t?" conflict-"+t.toLowerCase():"");r+=s?" new":"";return r}function i(t,u){var r=u.type==="INSERT";var s=[];u.eachLine(function(y){var x=L(y.line.lineType,y.line.conflictMarker,r,y.attributes.expanded);var w=y.handles.FROM;var v=y.handles.TO;if(w){t.addLineClass(w,"wrap",x);if(r){s.push(w)}}if(v&&v!==w){t.addLineClass(v,"wrap",x);if(r){s.push(v)}}}).done(function(){if(s.length){U(t,s)}})}function U(s,r){setTimeout(function(){if(!s._editor){return }s.operation(function(){q.each(r,function(t,u){s.removeLineClass(t,"wrap","new")})})},1500)}function Q(r){r.$container.addClass("diff-api-ready")}function Z(s){var r=d.extend({},s);delete r.pullRequest;delete r.fileChange;return C.freeze(r)}function h(r){q.defer(q.bind(X.trigger,X,"stash.feature.fileContent.diffViewContentChanged",null,r))}function m(r){q.defer(q.bind(X.trigger,X,"stash.feature.fileContent.diffViewContentLoaded",null,r))}function J(t,r){var s=new S(t,d.extend({mode:"text/plain",readOnly:true,lineNumbers:false,wholeLineUpdateBefore:false,cursorBlinkRate:0,styleSelectedText:true},r));M(s);B(s);k(s);return s}function B(r){r.on("keydown",f);r.on("keypress",f)}var R={};q.forEach([AJS.keyCode.TAB],function(r){R[r]=true});function N(s){var r=s.which||s.keyCode;return R[r]}function f(t,u){var r=["which","keyCode","shiftKey","ctrlKey","metaKey"];var s=jQuery.Event(u.type);q.forEach(r,function(v){s[v]=u[v]});d(document).trigger(s);u.codemirrorIgnore=N(u)}function M(s){var r=d(s.getWrapperElement()).find("textarea")[0];s.on("keydown",function(t,u){if(u.which>=37&&u.which<=40&&!u.shiftKey&&!t.somethingSelected()){r.blur()}})}function k(s){var r=false;var t=q.debounce(function(){var u;if(!r){u=s.lineAtHeight(s.getScrollInfo().top+s.heightAtLine(0));s.setSelection({line:u+1,ch:0})}r=false},10);s.on("contextmenu",function(){r=true});s.on("blur",function(u){if(u.somethingSelected()){t()}r=false})}var e=["getLineHandle","operation","markText","getLine","addLineClass","removeLineClass","setGutterMarker","addLineWidget","refresh"];function I(t,s){this._data=t;this.options=q.extend({},s);this.$container=s.$container;this._internalLines={CONTEXT:{},ADDED:{},REMOVED:{}};this.options.fileChange=new W(this.options.fileChange);var r=[this].concat(e);q.bindAll.apply(q,r);this._api=q.pick.apply(q,r)}q.extend(I.prototype,X.createEventMixin("diffView",{localOnly:true}));I.contentChangeType={INITIAL:"INITIAL",INSERT:"INSERT"};I.prototype.init=function(){this._pr=this.options.fileChange.getCommitRange().getPullRequest();this.$container.addClass("diff-type-"+this.options.fileChange.getType());var r=this._data;X.trigger("stash.feature.fileContent.diffViewDataLoaded",null,this._data);this.on("change",q.partial(O,this));this._ediffMarkersHandle=G.init({diffView:this});this._modifyDiff(r,"INITIAL");this._boundEvents=X.chain().on("stash.feature.changeset.difftree.collapseAnimationFinished",this.refresh).on("stash.feature.fileContent.diffViewContentLoaded",Q.bind(null,this));this.$container.addClass("fully-loaded")};I.prototype.destroy=function(){var r=this;this.trigger("destroy");q.forEach(["_boundEvents","_scrollControl","_scrollForwarder","_ediffMarkersHandle","_windowResize"],function(s){if(r[s]){if(typeof r[s]==="function"){r[s]()}else{r[s].destroy()}r[s]=null}});this._editor=null};function V(){throw new Error("DiffView implementation must define this.")}I.prototype.addLineWidget=function(r,u,t){var v=this._editorForHandle(r).addLineWidget(r._handle,u,t);var s=this;s.trigger("widgetAdded");return{clear:function(){v.clear();s.trigger("widgetCleared")},changed:function(){v.changed();s.trigger("widgetChanged")}}};I.prototype.setGutterMarker=V;I.prototype.addLineClass=V;I.prototype.removeLineClass=V;I.prototype.getLine=V;I.prototype._editorForHandle=V;I.prototype.markText=function(s,x,w,t){var r=s.handles.FROM||s.handles.TO;var u=this._editorForHandle(r);var v=u.getLineNumber(r._handle);return u.markText({line:v+x.lineOffset,ch:x.ch},{line:v+w.lineOffset,ch:w.ch},{className:t.className})};I.prototype.refresh=V;I.prototype.getLineHandle=function(r){if(r&&!r.lineType){var t=d(r).closest(".line").find(".line-number-marker");r={fileType:t.attr("data-file-type"),lineType:t.attr("data-line-type"),lineNumber:t.attr("data-line-number")}}var s=r&&this._internalLines[r.lineType][r.lineNumber]&&this._internalLines[r.lineType][r.lineNumber].handles;return s&&(s[r.fileType]||s.FROM||s.TO)};I.prototype.scrollHandleIntoView=function(s){var r=this._editorForHandle(s);if(r.lastLine()===s._handle.lineNo()){r.scrollTo(null,r.heightAtLine(r.lastLine()+1));return }r.scrollIntoView(s._handle.lineNo()+1)};I.prototype.api=function(){return this._api};I.prototype._acceptModification=V;I.prototype._requestWindowScrolls=function(r){var s=this;return o().done(function(AA){var t=new n.Bus();var AD=s.$container.addClass("full-window-scrolling");var w=AD.closest(".file-content");var v=AD.siblings(".file-toolbar");var AB=AD.children(".diff-editor").first().prevAll();function y(){return q.reduce(AB,function(AE,AF){return AF?AE+(d(AF).outerHeight()||0):AE},0)}var z;var AC=Y.fakeScroll(AD[0]);s._windowResize=l.getWindowSizeProperty().onValue(function(AE){z=AE.height-v.outerHeight();r.resize(AE.width,z)});s._scrollControl=AA;var x=q.debounce(function(){AA.refresh()},10);s.on("widgetAdded",x);s.on("widgetChanged",x);s.on("widgetCleared",x);s.on("change",x);if(s.options.commentContext){s.options.commentContext.on("fileCommentsResized",x)}r.onInternalScroll(function(AE,AF){AA.scroll(AE,AF!=null?AF+y():null)});r.onSizeChange(x);s._scrollForwarder=new b(t,[{id:"file-comments-and-messages",getHeight:function(){return y()||0},setScrollTop:function(AE){AC(0,AE)}},{id:"editors",getHeight:function(){return Infinity},setScrollTop:function(AE){r.scroll(null,AE)}}]);var u;if(s.options.commentContext){u=s._scrollForwarder.heightsChanged.bind(s._scrollForwarder);s.options.commentContext.on("fileCommentsResized",u)}AA.setTarget({scrollSizing:function(){var AE=r.scrollSizing();return{height:AE.height+y(),clientHeight:AE.clientHeight}},offset:function(){return w.offset()},scroll:function(AE,AF){if(AF!=null){t.push({top:AF})}}})}).fail(function(t){})};I._combineTexts=function(r){return q.chain(r).pluck("line").pluck("line").value().join("\n")};I.prototype._createEditor=function(r,t){r=d.extend({value:""},r,{gutters:q.uniq(["CodeMirror-linewidget"].concat(r.gutters||[]).concat(["line-number-marker"]))});var s;if(t&&t.length){s=t[0]}else{s=this.$container[0]}return J(s,r)};I.prototype._getLineClasses=L;I.prototype._modifyDiff=function(w,r){var t=[].slice.call(arguments,2);var s=this;w=d.extend(true,{},w);var u=F(w,{relevantContextLines:this.options.relevantContextLines});q.forEach(u,function(x){s._internalLines[x.line.lineType][x.line.lineNumber]=x});function v(){this._acceptModification.apply(this,[w,u,r].concat(t));q.chain(u).pluck("handles").values().flatten().each(C.freeze);C.deepFreeze(u,!"refreezeFrozen");var x=C.freeze({type:r,diff:w,linesAdded:u.length,pullRequest:this._pr,fileChange:this.options.fileChange,eachLine:function(z){var AA=P.frameBatchedMap(z,{min:500,initial:200},s.operation.bind(s));var y=AA(u);s.on("destroy",y.reject.bind(y));return y.promise()}});i(this,{type:r,eachLine:function(y){q.forEach(u,y);return d.Deferred().resolve()}});this.trigger("change",x);if(r==="INITIAL"){this.trigger("load",x)}}this.operation(q.bind(v,this))};return I});