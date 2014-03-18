(function(){var A=CodeMirror.Pos;function B(J,H,K,F){this.atOccurrence=false;this.doc=J;if(F==null&&typeof H=="string"){F=false}K=K?J.clipPos(K):A(0,0);this.pos={from:K,to:K};if(typeof H!="string"){if(!H.global){H=new RegExp(H.source,H.ignoreCase?"ig":"g")}this.matches=function(O,S){if(O){H.lastIndex=0;var L=J.getLine(S.line).slice(0,S.ch),Q=0,N,R;for(;;){H.lastIndex=Q;var P=H.exec(L);if(!P){break}N=P;R=N.index;Q=N.index+(N[0].length||1);if(Q==L.length){break}}var M=(N&&N[0].length)||0;if(!M){if(R==0&&L.length==0){N=undefined}else{if(R!=J.getLine(S.line).length){M++}}}}else{H.lastIndex=S.ch;var L=J.getLine(S.line),N=H.exec(L);var M=(N&&N[0].length)||0;var R=N&&N.index;if(R+M!=L.length&&!M){M=1}}if(N&&M){return{from:A(S.line,R),to:A(S.line,R+M),match:N}}}}else{var D=H;if(F){H=H.toLowerCase()}var E=F?function(L){return L.toLowerCase()}:function(L){return L};var I=H.split("\n");if(I.length==1){if(!H.length){this.matches=function(){}}else{this.matches=function(N,P){if(N){var O=J.getLine(P.line).slice(0,P.ch),L=E(O);var M=L.lastIndexOf(H);if(M>-1){M=C(O,L,M);return{from:A(P.line,M),to:A(P.line,M+D.length)}}}else{var O=J.getLine(P.line).slice(P.ch),L=E(O);var M=L.indexOf(H);if(M>-1){M=C(O,L,M)+P.ch;return{from:A(P.line,M),to:A(P.line,M+D.length)}}}}}}else{var G=D.split("\n");this.matches=function(M,O){var S=I.length-1;if(M){if(O.line-(I.length-1)<J.firstLine()){return }if(E(J.getLine(O.line).slice(0,G[S].length))!=I[I.length-1]){return }var R=A(O.line,G[S].length);for(var N=O.line-1,L=S-1;L>=1;--L,--N){if(I[L]!=E(J.getLine(N))){return }}var T=J.getLine(N),P=T.length-G[0].length;if(E(T.slice(P))!=I[0]){return }return{from:A(N,P),to:R}}else{if(O.line+(I.length-1)>J.lastLine()){return }var T=J.getLine(O.line),P=T.length-G[0].length;if(E(T.slice(P))!=I[0]){return }var Q=A(O.line,P);for(var N=O.line+1,L=1;L<S;++L,++N){if(I[L]!=E(J.getLine(N))){return }}if(J.getLine(N).slice(0,G[S].length)!=I[S]){return }return{from:Q,to:A(N,G[S].length)}}}}}}B.prototype={findNext:function(){return this.find(false)},findPrevious:function(){return this.find(true)},find:function(E){var D=this,H=this.doc.clipPos(E?this.pos.from:this.pos.to);function F(I){var J=A(I,0);D.pos={from:J,to:J};D.atOccurrence=false;return false}for(;;){if(this.pos=this.matches(E,H)){this.atOccurrence=true;return this.pos.match||true}if(E){if(!H.line){return F(0)}H=A(H.line-1,this.doc.getLine(H.line-1).length)}else{var G=this.doc.lineCount();if(H.line==G-1){return F(G)}H=A(H.line+1,0)}}},from:function(){if(this.atOccurrence){return this.pos.from}},to:function(){if(this.atOccurrence){return this.pos.to}},replace:function(E){if(!this.atOccurrence){return }var D=CodeMirror.splitLines(E);this.doc.replaceRange(D,this.pos.from,this.pos.to);this.pos.to=A(this.pos.from.line+D.length-1,D[D.length-1].length+(D.length==1?this.pos.from.ch:0))}};function C(H,F,G){if(H.length==F.length){return G}for(var E=Math.min(G,H.length);;){var D=H.slice(0,E).toLowerCase().length;if(D<G){++E}else{if(D>G){--E}else{return E}}}}CodeMirror.defineExtension("getSearchCursor",function(E,F,D){return new B(this.doc,E,F,D)});CodeMirror.defineDocExtension("getSearchCursor",function(E,F,D){return new B(this,E,F,D)})})();