CodeMirror.defineMode("pig",function(L,E){var F=E.keywords,A=E.builtins,G=E.types,H=E.multiLineStrings;var C=/[*+\-%<>=&?:\/!|]/;function B(P,O,N){O.tokenize=N;return N(P,O)}var K;function J(O,N){K=O;return N}function I(Q,P){var O=false;var N;while(N=Q.next()){if(N=="/"&&O){P.tokenize=D;break}O=(N=="*")}return J("comment","comment")}function M(N){return function(S,Q){var R=false,P,O=false;while((P=S.next())!=null){if(P==N&&!R){O=true;break}R=!R&&P=="\\"}if(O||!(R||H)){Q.tokenize=D}return J("string","error")}}function D(P,O){var N=P.next();if(N=='"'||N=="'"){return B(P,O,M(N))}else{if(/[\[\]{}\(\),;\.]/.test(N)){return J(N)}else{if(/\d/.test(N)){P.eatWhile(/[\w\.]/);return J("number","number")}else{if(N=="/"){if(P.eat("*")){return B(P,O,I)}else{P.eatWhile(C);return J("operator","operator")}}else{if(N=="-"){if(P.eat("-")){P.skipToEnd();return J("comment","comment")}else{P.eatWhile(C);return J("operator","operator")}}else{if(C.test(N)){P.eatWhile(C);return J("operator","operator")}else{P.eatWhile(/[\w\$_]/);if(F&&F.propertyIsEnumerable(P.current().toUpperCase())){if(P.eat(")")||P.eat(".")){}else{return("keyword","keyword")}}if(A&&A.propertyIsEnumerable(P.current().toUpperCase())){return("keyword","variable-2")}if(G&&G.propertyIsEnumerable(P.current().toUpperCase())){return("keyword","variable-3")}return J("variable","pig-word")}}}}}}}return{startState:function(){return{tokenize:D,startOfLine:true}},token:function(P,O){if(P.eatSpace()){return null}var N=O.tokenize(P,O);return N}}});(function(){function B(H){var F={},G=H.split(" ");for(var E=0;E<G.length;++E){F[G[E]]=true}return F}var A="ABS ACOS ARITY ASIN ATAN AVG BAGSIZE BINSTORAGE BLOOM BUILDBLOOM CBRT CEIL CONCAT COR COS COSH COUNT COUNT_STAR COV CONSTANTSIZE CUBEDIMENSIONS DIFF DISTINCT DOUBLEABS DOUBLEAVG DOUBLEBASE DOUBLEMAX DOUBLEMIN DOUBLEROUND DOUBLESUM EXP FLOOR FLOATABS FLOATAVG FLOATMAX FLOATMIN FLOATROUND FLOATSUM GENERICINVOKER INDEXOF INTABS INTAVG INTMAX INTMIN INTSUM INVOKEFORDOUBLE INVOKEFORFLOAT INVOKEFORINT INVOKEFORLONG INVOKEFORSTRING INVOKER ISEMPTY JSONLOADER JSONMETADATA JSONSTORAGE LAST_INDEX_OF LCFIRST LOG LOG10 LOWER LONGABS LONGAVG LONGMAX LONGMIN LONGSUM MAX MIN MAPSIZE MONITOREDUDF NONDETERMINISTIC OUTPUTSCHEMA  PIGSTORAGE PIGSTREAMING RANDOM REGEX_EXTRACT REGEX_EXTRACT_ALL REPLACE ROUND SIN SINH SIZE SQRT STRSPLIT SUBSTRING SUM STRINGCONCAT STRINGMAX STRINGMIN STRINGSIZE TAN TANH TOBAG TOKENIZE TOMAP TOP TOTUPLE TRIM TEXTLOADER TUPLESIZE UCFIRST UPPER UTF8STORAGECONVERTER ";var C="VOID IMPORT RETURNS DEFINE LOAD FILTER FOREACH ORDER CUBE DISTINCT COGROUP JOIN CROSS UNION SPLIT INTO IF OTHERWISE ALL AS BY USING INNER OUTER ONSCHEMA PARALLEL PARTITION GROUP AND OR NOT GENERATE FLATTEN ASC DESC IS STREAM THROUGH STORE MAPREDUCE SHIP CACHE INPUT OUTPUT STDERROR STDIN STDOUT LIMIT SAMPLE LEFT RIGHT FULL EQ GT LT GTE LTE NEQ MATCHES TRUE FALSE DUMP";var D="BOOLEAN INT LONG FLOAT DOUBLE CHARARRAY BYTEARRAY BAG TUPLE MAP ";CodeMirror.defineMIME("text/x-pig",{name:"pig",builtins:B(A),keywords:B(C),types:B(D)});CodeMirror.registerHelper("hintWords","pig",(A+D+C).split(" "))}());