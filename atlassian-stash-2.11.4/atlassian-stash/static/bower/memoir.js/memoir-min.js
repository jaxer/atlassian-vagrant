(function(J,C){var I=Boolean(typeof history!=="undefined"&&history.pushState&&history.replaceState&&!((/ Mobile\/([1-7][a-z]|(8([abcde]|f(1[0-8]))))/i).test(navigator.userAgent)||(/AppleWebKit\/5([0-2]|3[0-2])/i).test(navigator.userAgent))),M=function(){return M.nativeSupport()};M.version="0.1.1";M.nativeSupport=function(){return I};var A={"memoir.popstate":[],"memoir.changestate":[]};function B(O,R){for(var P=0,Q=A[O],N=Q.length;P<N;P++){Q[P](R)}}var L={pushState:function(O,P,N){history.pushState(O,P||"",N||"");B("memoir.changestate",{state:O})},replaceState:function(O,P,N){history.replaceState(O,P||"",N||"");B("memoir.changestate",{state:O})},bind:function(N,O){if(N in A){A[N].push(O)}},state:function(){return history.state},initialState:function(N){return history.replaceState(N,"",location.href)}};var D={pushState:function(O,P,N){if(N&&location.href!==N){location.href=N}},replaceState:function(O,P,N){if(N&&location.href!==N){location.href=N}},bind:function(N,O){},initialState:function(N){},state:function(){return null}};function K(O,N){for(var P in N){if(N.hasOwnProperty(P)){O[P]=N[P]}}}K(M,I?L:D);var F=J.onpopstate,E=("state" in history),H=location.href;J.onpopstate=function(O){if(F){F.call(this,O)}var N=!E&&location.href==H;E=true;if(!N){B("memoir.popstate",O);B("memoir.changestate",O)}};if(typeof define!=="undefined"){define("memoir",[],function(){return M})}else{var G=J.memoir;M.noConflict=G?function(){J.memoir=G;return M}:function(){delete J.memoir;return M};J.memoir=M}})(window);