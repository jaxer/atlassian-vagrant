define("util/bacon",["bacon","jquery","underscore","util/events","util/performance","exports"],function(A,E,H,I,G,D){D.split=function F(K,J){return A.fromBinder(function(O){var L=[];var M;var N=E.Callbacks();N.add(K.onValue(function(P){var Q=J(P);if(M&&Q!==M){O(L);L=[]}M=Q;L.push(P)}));N.add(K.onEnd(function(){if(L.length>0){O(L)}O(new A.End())}));return H.bind(N.fire,N)})};D.toArray=function C(K){var J=[];K.onValue(function(L){J.push(L)});return J};D.getWindowScrollProperty=H.once(function(){var J=E(window);function K(){return{left:J.scrollLeft(),top:J.scrollTop()}}return A.fromBinder(function(N){var M=G.enqueueCapped(requestAnimationFrame,N);var L=H.debounce(M,20);J.on("scroll",M).on("scroll",L);return function(){J.off("scroll",M).off("scroll",L)}}).map(K).skipDuplicates(function(M,L){return M.left===L.left&&M.top===L.top}).toProperty(K())});D.getWindowSizeProperty=H.once(function(){var J=E(window);return A.fromBinder(function(L){var K=I.chain().on("window.resize",function(M,N){L(new A.Next({width:M,height:N}))});return function(){K.destroy()}}).toProperty({width:J.width(),height:J.height()})});D.takeBetween=function B(P,R){var J=R.start;var M=R.end;var Q=R.startInclusive;var O=R.endInclusive;var K=R.equals||function(T,S){return T===S};if(K(J,M)){if(Q||O){return P.skipWhile(function(S){return !K(S,J)}).take(1)}return A.never()}var L,N;return P.skipWhile(function(S){if(N||L){return false}if(K(S,J)){L=true;return !Q}if(K(S,M)){N=true;return !O}return true}).takeWhile(function(S){if(K(S,J)){L=true;return Q}if(K(S,M)){N=true;return O}return !(N&&L)})}});