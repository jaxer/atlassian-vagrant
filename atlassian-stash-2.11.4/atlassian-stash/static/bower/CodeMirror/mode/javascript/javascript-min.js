CodeMirror.defineMode("javascript",function(w,AG){var I=w.indentUnit;var W=AG.statementIndent;var AU=AG.jsonld;var V=AG.json||AU;var E=AG.typescript;var AN=function(){function Ak(Am){return{type:Am,style:"keyword"}}var Af=Ak("keyword a"),Ad=Ak("keyword b"),Ac=Ak("keyword c");var Ae=Ak("operator"),Ai={type:"atom",style:"atom"};var Ag={"if":Ak("if"),"while":Af,"with":Af,"else":Ad,"do":Ad,"try":Ad,"finally":Ad,"return":Ac,"break":Ac,"continue":Ac,"new":Ac,"delete":Ac,"throw":Ac,"debugger":Ac,"var":Ak("var"),"const":Ak("var"),let:Ak("var"),"function":Ak("function"),"catch":Ak("catch"),"for":Ak("for"),"switch":Ak("switch"),"case":Ak("case"),"default":Ak("default"),"in":Ae,"typeof":Ae,"instanceof":Ae,"true":Ai,"false":Ai,"null":Ai,"undefined":Ai,"NaN":Ai,"Infinity":Ai,"this":Ak("this"),module:Ak("module"),"class":Ak("class"),"super":Ak("atom"),yield:Ac,"export":Ak("export"),"import":Ak("import"),"extends":Ac};if(E){var Al={type:"variable",style:"variable-3"};var Ah={"interface":Ak("interface"),"extends":Ak("extends"),constructor:Ak("constructor"),"public":Ak("public"),"private":Ak("private"),"protected":Ak("protected"),"static":Ak("static"),string:Al,number:Al,bool:Al,any:Al};for(var Aj in Ah){Ag[Aj]=Ah[Aj]}}return Ag}();var l=/[+\-*&%=<>!?|~^]/;var AM=/^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;function b(Af){var Ad=false,Ac,Ae=false;while((Ac=Af.next())!=null){if(!Ad){if(Ac=="/"&&!Ae){return }if(Ac=="["){Ae=true}else{if(Ae&&Ac=="]"){Ae=false}}}Ad=!Ad&&Ac=="\\"}}var o,c;function h(Ae,Ad,Ac){o=Ae;c=Ac;return Ad}function q(Ag,Ae){var Ac=Ag.next();if(Ac=='"'||Ac=="'"){Ae.tokenize=n(Ac);return Ae.tokenize(Ag,Ae)}else{if(Ac=="."&&Ag.match(/^\d+(?:[eE][+\-]?\d+)?/)){return h("number","number")}else{if(Ac=="."&&Ag.match("..")){return h("spread","meta")}else{if(/[\[\]{}\(\),;\:\.]/.test(Ac)){return h(Ac)}else{if(Ac=="="&&Ag.eat(">")){return h("=>","operator")}else{if(Ac=="0"&&Ag.eat(/x/i)){Ag.eatWhile(/[\da-f]/i);return h("number","number")}else{if(/\d/.test(Ac)){Ag.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);return h("number","number")}else{if(Ac=="/"){if(Ag.eat("*")){Ae.tokenize=AT;return AT(Ag,Ae)}else{if(Ag.eat("/")){Ag.skipToEnd();return h("comment","comment")}else{if(Ae.lastType=="operator"||Ae.lastType=="keyword c"||Ae.lastType=="sof"||/^[\[{}\(,;:]$/.test(Ae.lastType)){b(Ag);Ag.eatWhile(/[gimy]/);return h("regexp","string-2")}else{Ag.eatWhile(l);return h("operator","operator",Ag.current())}}}}else{if(Ac=="`"){Ae.tokenize=AV;return AV(Ag,Ae)}else{if(Ac=="#"){Ag.skipToEnd();return h("error","error")}else{if(l.test(Ac)){Ag.eatWhile(l);return h("operator","operator",Ag.current())}else{Ag.eatWhile(/[\w\$_]/);var Af=Ag.current(),Ad=AN.propertyIsEnumerable(Af)&&AN[Af];return(Ad&&Ae.lastType!=".")?h(Ad.type,Ad.style,Af):h("variable","variable",Af)}}}}}}}}}}}}function n(Ac){return function(Ag,Ae){var Af=false,Ad;if(AU&&Ag.peek()=="@"&&Ag.match(AM)){Ae.tokenize=q;return h("jsonld-keyword","meta")}while((Ad=Ag.next())!=null){if(Ad==Ac&&!Af){break}Af=!Af&&Ad=="\\"}if(!Af){Ae.tokenize=q}return h("string","string")}}function AT(Af,Ae){var Ac=false,Ad;while(Ad=Af.next()){if(Ad=="/"&&Ac){Ae.tokenize=q;break}Ac=(Ad=="*")}return h("comment","comment")}function AV(Af,Ad){var Ae=false,Ac;while((Ac=Af.next())!=null){if(!Ae&&(Ac=="`"||Ac=="$"&&Af.eat("{"))){Ad.tokenize=q;break}Ae=!Ae&&Ac=="\\"}return h("quasi","string-2",Af.current())}var J="([{}])";function AQ(Ai,Af){if(Af.fatArrowAt){Af.fatArrowAt=null}var Ae=Ai.string.indexOf("=>",Ai.start);if(Ae<0){return }var Ah=0,Ad=false;for(var Aj=Ae-1;Aj>=0;--Aj){var Ac=Ai.string.charAt(Aj);var Ag=J.indexOf(Ac);if(Ag>=0&&Ag<3){if(!Ah){++Aj;break}if(--Ah==0){break}}else{if(Ag>=3&&Ag<6){++Ah}else{if(/[$\w]/.test(Ac)){Ad=true}else{if(Ad&&!Ah){++Aj;break}}}}}if(Ad&&!Ah){Af.fatArrowAt=Aj}}var A={atom:true,number:true,variable:true,string:true,regexp:true,"this":true,"jsonld-keyword":true};function f(Ah,Ad,Ac,Ag,Ae,Af){this.indented=Ah;this.column=Ad;this.type=Ac;this.prev=Ae;this.info=Af;if(Ag!=null){this.align=Ag}}function O(Af,Ae){for(var Ad=Af.localVars;Ad;Ad=Ad.next){if(Ad.name==Ae){return true}}for(var Ac=Af.context;Ac;Ac=Ac.prev){for(var Ad=Ac.vars;Ad;Ad=Ad.next){if(Ad.name==Ae){return true}}}}function D(Ag,Ad,Ac,Af,Ah){var Ai=Ag.cc;Z.state=Ag;Z.stream=Ah;Z.marked=null,Z.cc=Ai;if(!Ag.lexical.hasOwnProperty("align")){Ag.lexical.align=true}while(true){var Ae=Ai.length?Ai.pop():V?AK:Aa;if(Ae(Ac,Af)){while(Ai.length&&Ai[Ai.length-1].lex){Ai.pop()()}if(Z.marked){return Z.marked}if(Ac=="variable"&&O(Ag,Af)){return"variable-2"}return Ad}}}var Z={state:null,column:null,marked:null,cc:null};function x(){for(var Ac=arguments.length-1;Ac>=0;Ac--){Z.cc.push(arguments[Ac])}}function AB(){x.apply(null,arguments);return true}function AP(Ad){function Ac(Ag){for(var Af=Ag;Af;Af=Af.next){if(Af.name==Ad){return true}}return false}var Ae=Z.state;if(Ae.context){Z.marked="def";if(Ac(Ae.localVars)){return }Ae.localVars={name:Ad,next:Ae.localVars}}else{if(Ac(Ae.globalVars)){return }if(AG.globalVars){Ae.globalVars={name:Ad,next:Ae.globalVars}}}}var M={name:"this",next:{name:"arguments"}};function S(){Z.state.context={prev:Z.state.context,vars:Z.state.localVars};Z.state.localVars=M}function T(){Z.state.localVars=Z.state.context.vars;Z.state.context=Z.state.context.prev}function AY(Ad,Ae){var Ac=function(){var Ag=Z.state,Af=Ag.indented;if(Ag.lexical.type=="stat"){Af=Ag.lexical.indented}Ag.lexical=new f(Af,Z.stream.column(),Ad,null,Ag.lexical,Ae)};Ac.lex=true;return Ac}function F(){var Ac=Z.state;if(Ac.lexical.prev){if(Ac.lexical.type==")"){Ac.indented=Ac.lexical.indented}Ac.lexical=Ac.lexical.prev}}F.lex=true;function N(Ac){return function(Ad){if(Ad==Ac){return AB()}else{if(Ac==";"){return x()}else{return AB(arguments.callee)}}}}function Aa(Ac,Ad){if(Ac=="var"){return AB(AY("vardef",Ad.length),B,N(";"),F)}if(Ac=="keyword a"){return AB(AY("form"),AK,Aa,F)}if(Ac=="keyword b"){return AB(AY("form"),Aa,F)}if(Ac=="{"){return AB(AY("}"),U,F)}if(Ac==";"){return AB()}if(Ac=="if"){return AB(AY("form"),AK,Aa,F,C)}if(Ac=="function"){return AB(i)}if(Ac=="for"){return AB(AY("form"),Q,Aa,F)}if(Ac=="variable"){return AB(AY("stat"),Ab)}if(Ac=="switch"){return AB(AY("form"),AK,AY("}","switch"),N("{"),U,F,F)}if(Ac=="case"){return AB(AK,N(":"))}if(Ac=="default"){return AB(N(":"))}if(Ac=="catch"){return AB(AY("form"),S,N("("),AC,N(")"),Aa,F,T)}if(Ac=="module"){return AB(AY("form"),S,d,T,F)}if(Ac=="class"){return AB(AY("form"),s,r,F)}if(Ac=="export"){return AB(AY("form"),AZ,F)}if(Ac=="import"){return AB(AY("form"),AD,F)}return x(AY("stat"),AK,N(";"),F)}function AK(Ac){return v(Ac,false)}function AX(Ac){return v(Ac,true)}function v(Ad,Af){if(Z.state.fatArrowAt==Z.stream.start){var Ac=Af?j:t;if(Ad=="("){return AB(S,AY(")"),AO(G,")"),F,N("=>"),Ac,T)}else{if(Ad=="variable"){return x(S,G,N("=>"),Ac,T)}}}var Ae=Af?H:y;if(A.hasOwnProperty(Ad)){return AB(Ae)}if(Ad=="function"){return AB(i)}if(Ad=="keyword c"){return AB(Af?AH:AF)}if(Ad=="("){return AB(AY(")"),AF,AS,N(")"),F,Ae)}if(Ad=="operator"||Ad=="spread"){return AB(Af?AX:AK)}if(Ad=="["){return AB(AY("]"),K,F,Ae)}if(Ad=="{"){return AR(P,"}",null,Ae)}return AB()}function AF(Ac){if(Ac.match(/[;\}\)\],]/)){return x()}return x(AK)}function AH(Ac){if(Ac.match(/[;\}\)\],]/)){return x()}return x(AX)}function y(Ac,Ad){if(Ac==","){return AB(AK)}return H(Ac,Ad,false)}function H(Ac,Ae,Ag){var Ad=Ag==false?y:H;var Af=Ag==false?AK:AX;if(Ae=="=>"){return AB(S,Ag?j:t,T)}if(Ac=="operator"){if(/\+\+|--/.test(Ae)){return AB(Ad)}if(Ae=="?"){return AB(AK,N(":"),Af)}return AB(Af)}if(Ac=="quasi"){Z.cc.push(Ad);return m(Ae)}if(Ac==";"){return }if(Ac=="("){return AR(AX,")","call",Ad)}if(Ac=="."){return AB(AI,Ad)}if(Ac=="["){return AB(AY("]"),AF,N("]"),F,Ad)}}function m(Ac){if(Ac.slice(Ac.length-2)!="${"){return AB()}return AB(AK,L)}function L(Ac){if(Ac=="}"){Z.marked="string-2";Z.state.tokenize=AV;return AB()}}function t(Ac){AQ(Z.stream,Z.state);if(Ac=="{"){return x(Aa)}return x(AK)}function j(Ac){AQ(Z.stream,Z.state);if(Ac=="{"){return x(Aa)}return x(AX)}function Ab(Ac){if(Ac==":"){return AB(F,Aa)}return x(y,N(";"),F)}function AI(Ac){if(Ac=="variable"){Z.marked="property";return AB()}}function P(Ac,Ad){if(Ac=="variable"){Z.marked="property";if(Ad=="get"||Ad=="set"){return AB(e)}}else{if(Ac=="number"||Ac=="string"){Z.marked=AU?"property":(Ac+" property")}else{if(Ac=="["){return AB(AK,N("]"),g)}}}if(A.hasOwnProperty(Ac)){return AB(g)}}function e(Ac){if(Ac!="variable"){return x(g)}Z.marked="property";return AB(i)}function g(Ac){if(Ac==":"){return AB(AX)}if(Ac=="("){return x(i)}}function AO(Ae,Ac){function Ad(Ag){if(Ag==","){var Af=Z.state.lexical;if(Af.info=="call"){Af.pos=(Af.pos||0)+1}return AB(Ae,Ad)}if(Ag==Ac){return AB()}return AB(N(Ac))}return function(Af){if(Af==Ac){return AB()}return x(Ae,Ad)}}function AR(Af,Ac,Ae){for(var Ad=3;Ad<arguments.length;Ad++){Z.cc.push(arguments[Ad])}return AB(AY(Ac,Ae),AO(Af,Ac),F)}function U(Ac){if(Ac=="}"){return AB()}return x(Aa,U)}function p(Ac){if(E&&Ac==":"){return AB(AA)}}function AA(Ac){if(Ac=="variable"){Z.marked="variable-3";return AB()}}function B(){return x(G,p,z,u)}function G(Ac,Ad){if(Ac=="variable"){AP(Ad);return AB()}if(Ac=="["){return AR(G,"]")}if(Ac=="{"){return AR(AW,"}")}}function AW(Ac,Ad){if(Ac=="variable"&&!Z.stream.match(/^\s*:/,false)){AP(Ad);return AB(z)}if(Ac=="variable"){Z.marked="property"}return AB(N(":"),G,z)}function z(Ac,Ad){if(Ad=="="){return AB(AX)}}function u(Ac){if(Ac==","){return AB(B)}}function C(Ac,Ad){if(Ac=="keyword b"&&Ad=="else"){return AB(AY("form"),Aa,F)}}function Q(Ac){if(Ac=="("){return AB(AY(")"),a,N(")"),F)}}function a(Ac){if(Ac=="var"){return AB(B,N(";"),Y)}if(Ac==";"){return AB(Y)}if(Ac=="variable"){return AB(R)}return x(AK,N(";"),Y)}function R(Ac,Ad){if(Ad=="in"||Ad=="of"){Z.marked="keyword";return AB(AK)}return AB(y,Y)}function Y(Ac,Ad){if(Ac==";"){return AB(X)}if(Ad=="in"||Ad=="of"){Z.marked="keyword";return AB(AK)}return x(AK,N(";"),X)}function X(Ac){if(Ac!=")"){AB(AK)}}function i(Ac,Ad){if(Ad=="*"){Z.marked="keyword";return AB(i)}if(Ac=="variable"){AP(Ad);return AB(i)}if(Ac=="("){return AB(S,AY(")"),AO(AC,")"),F,Aa,T)}}function AC(Ac){if(Ac=="spread"){return AB(AC)}return x(G,p)}function s(Ac,Ad){if(Ac=="variable"){AP(Ad);return AB(k)}}function k(Ac,Ad){if(Ad=="extends"){return AB(AK)}}function r(Ac){if(Ac=="{"){return AR(P,"}")}}function d(Ac,Ad){if(Ac=="string"){return AB(Aa)}if(Ac=="variable"){AP(Ad);return AB(AE)}}function AZ(Ac,Ad){if(Ad=="*"){Z.marked="keyword";return AB(AE,N(";"))}if(Ad=="default"){Z.marked="keyword";return AB(AK,N(";"))}return x(Aa)}function AD(Ac){if(Ac=="string"){return AB()}return x(AL,AE)}function AL(Ac,Ad){if(Ac=="{"){return AR(AL,"}")}if(Ac=="variable"){AP(Ad)}return AB()}function AE(Ac,Ad){if(Ad=="from"){Z.marked="keyword";return AB(AK)}}function K(Ac){if(Ac=="]"){return AB()}return x(AX,AJ)}function AJ(Ac){if(Ac=="for"){return x(AS,N("]"))}if(Ac==","){return AB(AO(AX,"]"))}return x(AO(AX,"]"))}function AS(Ac){if(Ac=="for"){return AB(Q,AS)}if(Ac=="if"){return AB(AK,AS)}}return{startState:function(Ad){var Ac={tokenize:q,lastType:"sof",cc:[],lexical:new f((Ad||0)-I,0,"block",false),localVars:AG.localVars,context:AG.localVars&&{vars:AG.localVars},indented:0};if(AG.globalVars){Ac.globalVars=AG.globalVars}return Ac},token:function(Ae,Ad){if(Ae.sol()){if(!Ad.lexical.hasOwnProperty("align")){Ad.lexical.align=false}Ad.indented=Ae.indentation();AQ(Ae,Ad)}if(Ad.tokenize!=AT&&Ae.eatSpace()){return null}var Ac=Ad.tokenize(Ae,Ad);if(o=="comment"){return Ac}Ad.lastType=o=="operator"&&(c=="++"||c=="--")?"incdec":o;return D(Ad,Ac,o,c,Ae)},indent:function(Ai,Ac){if(Ai.tokenize==AT){return CodeMirror.Pass}if(Ai.tokenize!=q){return 0}var Ah=Ac&&Ac.charAt(0),Af=Ai.lexical;for(var Ae=Ai.cc.length-1;Ae>=0;--Ae){var Aj=Ai.cc[Ae];if(Aj==F){Af=Af.prev}else{if(Aj!=C){break}}}if(Af.type=="stat"&&Ah=="}"){Af=Af.prev}if(W&&Af.type==")"&&Af.prev.type=="stat"){Af=Af.prev}var Ag=Af.type,Ad=Ah==Ag;if(Ag=="vardef"){return Af.indented+(Ai.lastType=="operator"||Ai.lastType==","?Af.info+1:0)}else{if(Ag=="form"&&Ah=="{"){return Af.indented}else{if(Ag=="form"){return Af.indented+I}else{if(Ag=="stat"){return Af.indented+(Ai.lastType=="operator"||Ai.lastType==","?W||I:0)}else{if(Af.info=="switch"&&!Ad&&AG.doubleIndentSwitch!=false){return Af.indented+(/^(?:case|default)\b/.test(Ac)?I:2*I)}else{if(Af.align){return Af.column+(Ad?0:1)}else{return Af.indented+(Ad?0:I)}}}}}}},electricChars:":{}",blockCommentStart:V?null:"/*",blockCommentEnd:V?null:"*/",lineComment:V?null:"//",fold:"brace",helperType:V?"json":"javascript",jsonldMode:AU,jsonMode:V}});CodeMirror.defineMIME("text/javascript","javascript");CodeMirror.defineMIME("text/ecmascript","javascript");CodeMirror.defineMIME("application/javascript","javascript");CodeMirror.defineMIME("application/ecmascript","javascript");CodeMirror.defineMIME("application/json",{name:"javascript",json:true});CodeMirror.defineMIME("application/x-json",{name:"javascript",json:true});CodeMirror.defineMIME("application/ld+json",{name:"javascript",jsonld:true});CodeMirror.defineMIME("text/typescript",{name:"javascript",typescript:true});CodeMirror.defineMIME("application/typescript",{name:"javascript",typescript:true});