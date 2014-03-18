CodeMirror.defineMode("julia",function(A,U){var C="error";function L(Z){return new RegExp("^(("+Z.join(")|(")+"))\\b")}var P=U.operators||/^\.?[|&^\\%*+\-<>!=\/]=?|\?|~|:|\$|\.[<>]|<<=?|>>>?=?|\.[<>=]=|->?|\/\/|\bin\b/;var H=U.delimiters||/^[;,()[\]{}]/;var I=U.identifiers||/^[_A-Za-z][_A-Za-z0-9]*!*/;var D=["begin","function","type","immutable","let","macro","for","while","quote","if","else","elseif","try","finally","catch","do"];var S=["end","else","elseif","catch","finally"];var N=["if","else","elseif","while","for","begin","let","end","do","try","catch","finally","return","break","continue","global","local","const","export","import","importall","using","function","macro","module","baremodule","type","immutable","quote","typealias","abstract","bitstype","ccall"];var B=["true","false","enumerate","open","close","nothing","NaN","Inf","print","println","Int","Int8","Uint8","Int16","Uint16","Int32","Uint32","Int64","Uint64","Int128","Uint128","Bool","Char","Float16","Float32","Float64","Array","Vector","Matrix","String","UTF8String","ASCIIString","error","warn","info","@printf"];var K=/^(`|'|"{3}|([br]?"))/;var J=L(N);var F=L(B);var M=L(D);var E=L(S);var W=/^@[_A-Za-z][_A-Za-z0-9]*/;var Q=/^:[_A-Za-z][_A-Za-z0-9]*/;var V=null;function R(a){var Z=T(a);if(Z=="["||Z=="{"){return true}else{return false}}function T(Z){if(Z.scopes.length==0){return null}return Z.scopes[Z.scopes.length-1]}function Y(e,b){var f=b.leaving_expr;if(e.sol()){f=false}b.leaving_expr=false;if(f){if(e.match(/^'+/)){return"operator"}}if(e.match(/^\.{2,3}/)){return"operator"}if(e.eatSpace()){return null}var Z=e.peek();if(Z==="#"){e.skipToEnd();return"comment"}if(Z==="["){b.scopes.push("[")}if(Z==="{"){b.scopes.push("{")}var g=T(b);if(g==="["&&Z==="]"){b.scopes.pop();b.leaving_expr=true}if(g==="{"&&Z==="}"){b.scopes.pop();b.leaving_expr=true}if(Z===")"){b.leaving_expr=true}var d;if(!R(b)&&(d=e.match(M,false))){b.scopes.push(d)}if(!R(b)&&e.match(E,false)){b.scopes.pop()}if(R(b)){if(e.match(/^end/)){return"number"}}if(e.match(/^=>/)){return"operator"}if(e.match(/^[0-9\.]/,false)){var a=RegExp(/^im\b/);var h=false;if(e.match(/^\d*\.(?!\.)\d+([ef][\+\-]?\d+)?/i)){h=true}if(e.match(/^\d+\.(?!\.)\d*/)){h=true}if(e.match(/^\.\d+/)){h=true}if(h){e.match(a);b.leaving_expr=true;return"number"}var c=false;if(e.match(/^0x[0-9a-f]+/i)){c=true}if(e.match(/^0b[01]+/i)){c=true}if(e.match(/^0o[0-7]+/i)){c=true}if(e.match(/^[1-9]\d*(e[\+\-]?\d+)?/)){c=true}if(e.match(/^0(?![\dx])/i)){c=true}if(c){e.match(a);b.leaving_expr=true;return"number"}}if(e.match(/^(::)|(<:)/)){return"operator"}if(!f&&e.match(Q)){return"string"}if(e.match(P)){return"operator"}if(e.match(K)){b.tokenize=O(e.current());return b.tokenize(e,b)}if(e.match(W)){return"meta"}if(e.match(H)){return null}if(e.match(J)){return"keyword"}if(e.match(F)){return"builtin"}if(e.match(I)){b.leaving_expr=true;return"variable"}e.next();return C}function O(Z){while("rub".indexOf(Z.charAt(0).toLowerCase())>=0){Z=Z.substr(1)}var b=Z.length==1;var a="string";function c(e,d){while(!e.eol()){e.eatWhile(/[^'"\\]/);if(e.eat("\\")){e.next();if(b&&e.eol()){return a}}else{if(e.match(Z)){d.tokenize=Y;return a}else{e.eat(/['"]/)}}}if(b){if(U.singleLineStringErrors){return C}else{d.tokenize=Y}}return a}c.isString=true;return c}function X(c,a){V=null;var Z=a.tokenize(c,a);var b=c.current();if(b==="."){Z=c.match(I,false)?null:C;if(Z===null&&a.lastStyle==="meta"){Z="meta"}return Z}return Z}var G={startState:function(){return{tokenize:Y,scopes:[],leaving_expr:false}},token:function(b,a){var Z=X(b,a);a.lastStyle=Z;return Z},indent:function(a,Z){var b=0;if(Z=="end"||Z=="]"||Z=="}"||Z=="else"||Z=="elseif"||Z=="catch"||Z=="finally"){b=-1}return(a.scopes.length+b)*4},lineComment:"#",fold:"indent",electricChars:"edlsifyh]}"};return G});CodeMirror.defineMIME("text/x-julia","julia");