CodeMirror.defineMode("properties",function(){return{token:function(E,D){var B=E.sol()||D.afterSection;var C=E.eol();D.afterSection=false;if(B){if(D.nextMultiline){D.inMultiline=true;D.nextMultiline=false}else{D.position="def"}}if(C&&!D.nextMultiline){D.inMultiline=false;D.position="def"}if(B){while(E.eatSpace()){}}var A=E.next();if(B&&(A==="#"||A==="!"||A===";")){D.position="comment";E.skipToEnd();return"comment"}else{if(B&&A==="["){D.afterSection=true;E.skipTo("]");E.eat("]");return"header"}else{if(A==="="||A===":"){D.position="quote";return null}else{if(A==="\\"&&D.position==="quote"){if(E.next()!=="u"){D.nextMultiline=true}}}}}return D.position},startState:function(){return{position:"def",nextMultiline:false,inMultiline:false,afterSection:false}}}});CodeMirror.defineMIME("text/x-properties","properties");CodeMirror.defineMIME("text/x-ini","properties");