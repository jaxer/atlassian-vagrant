CodeMirror.defineMode("mllike",function(E,C){var F={let:"keyword",rec:"keyword","in":"keyword",of:"keyword",and:"keyword","if":"keyword",then:"keyword","else":"keyword","for":"keyword",to:"keyword","while":"keyword","do":"keyword",done:"keyword",fun:"keyword","function":"keyword",val:"keyword",type:"keyword",mutable:"keyword",match:"keyword","with":"keyword","try":"keyword",open:"builtin",ignore:"builtin",begin:"keyword",end:"keyword"};var A=C.extraWords||{};for(var H in A){if(A.hasOwnProperty(H)){F[H]=C.extraWords[H]}}function G(L,J){var I=L.next();if(I==='"'){J.tokenize=D;return J.tokenize(L,J)}if(I==="("){if(L.eat("*")){J.commentLevel++;J.tokenize=B;return J.tokenize(L,J)}}if(I==="~"){L.eatWhile(/\w/);return"variable-2"}if(I==="`"){L.eatWhile(/\w/);return"quote"}if(I==="/"&&C.slashComments&&L.eat("/")){L.skipToEnd();return"comment"}if(/\d/.test(I)){L.eatWhile(/[\d]/);if(L.eat(".")){L.eatWhile(/[\d]/)}return"number"}if(/[+\-*&%=<>!?|]/.test(I)){return"operator"}L.eatWhile(/\w/);var K=L.current();return F[K]||"variable"}function D(M,K){var J,I=false,L=false;while((J=M.next())!=null){if(J==='"'&&!L){I=true;break}L=!L&&J==="\\"}if(I&&!L){K.tokenize=G}return"string"}function B(L,K){var J,I;while(K.commentLevel>0&&(I=L.next())!=null){if(J==="("&&I==="*"){K.commentLevel++}if(J==="*"&&I===")"){K.commentLevel--}J=I}if(K.commentLevel<=0){K.tokenize=G}return"comment"}return{startState:function(){return{tokenize:G,commentLevel:0}},token:function(J,I){if(J.eatSpace()){return null}return I.tokenize(J,I)},blockCommentStart:"(*",blockCommentEnd:"*)",lineComment:C.slashComments?"//":null}});CodeMirror.defineMIME("text/x-ocaml",{name:"mllike",extraWords:{succ:"keyword",trace:"builtin",exit:"builtin",print_string:"builtin",print_endline:"builtin","true":"atom","false":"atom",raise:"keyword"}});CodeMirror.defineMIME("text/x-fsharp",{name:"mllike",extraWords:{"abstract":"keyword",as:"keyword",assert:"keyword",base:"keyword","class":"keyword","default":"keyword",delegate:"keyword",downcast:"keyword",downto:"keyword",elif:"keyword",exception:"keyword",extern:"keyword","finally":"keyword",global:"keyword",inherit:"keyword",inline:"keyword","interface":"keyword",internal:"keyword",lazy:"keyword","let!":"keyword",member:"keyword",module:"keyword",namespace:"keyword","new":"keyword","null":"keyword",override:"keyword","private":"keyword","public":"keyword","return":"keyword","return!":"keyword",select:"keyword","static":"keyword",struct:"keyword",upcast:"keyword",use:"keyword","use!":"keyword",val:"keyword",when:"keyword",yield:"keyword","yield!":"keyword",List:"builtin",Seq:"builtin",Map:"builtin",Set:"builtin","int":"builtin",string:"builtin",raise:"builtin",failwith:"builtin",not:"builtin","true":"builtin","false":"builtin"},slashComments:true});