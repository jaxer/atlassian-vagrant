CodeMirror.defineMode("jade",function(){var B=/^(?:~|!|%|\^|\*|\+|=|\\|:|;|,|\/|\?|&|<|>|\|)/;var H=/^(\(|\[)/;var F=/^(\)|\])/;var A=/^(if|else|return|var|function|include|doctype|each)/;var G=/^(#|{|}|\.)/;var E=/^(in)/;var D=/^(html|head|title|meta|link|script|body|br|div|input|span|a|img)/;var C=/^(h1|h2|h3|h4|h5|p|strong|em)/;return{startState:function(){return{inString:false,stringType:"",beforeTag:true,justMatchedKeyword:false,afterParen:false}},token:function(J,I){if(!I.inString&&((J.peek()=='"')||(J.peek()=="'"))){I.stringType=J.peek();J.next();I.inString=true}if(I.inString){if(J.skipTo(I.stringType)){J.next();I.inString=false}else{J.skipToEnd()}I.justMatchedKeyword=false;return"string"}else{if(J.sol()&&J.eatSpace()){if(J.match(A)){I.justMatchedKeyword=true;J.eatSpace();return"keyword"}if(J.match(D)||J.match(C)){I.justMatchedKeyword=true;return"variable"}}else{if(J.sol()&&J.match(A)){I.justMatchedKeyword=true;J.eatSpace();return"keyword"}else{if(J.sol()&&(J.match(D)||J.match(C))){I.justMatchedKeyword=true;return"variable"}else{if(J.eatSpace()){I.justMatchedKeyword=false;if(J.match(E)&&J.eatSpace()){I.justMatchedKeyword=true;return"keyword"}}else{if(J.match(B)){I.justMatchedKeyword=false;return"atom"}else{if(J.match(H)){I.afterParen=true;I.justMatchedKeyword=true;return"def"}else{if(J.match(F)){I.afterParen=false;I.justMatchedKeyword=true;return"def"}else{if(J.match(G)){I.justMatchedKeyword=true;return"keyword"}else{if(J.eatSpace()){I.justMatchedKeyword=false}else{J.next();if(I.justMatchedKeyword){return"property"}else{if(I.afterParen){return"property"}}}}}}}}}}}}return null}}});CodeMirror.defineMIME("text/x-jade","jade");