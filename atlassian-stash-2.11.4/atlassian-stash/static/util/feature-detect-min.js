define("util/feature-detect",["underscore","exports"],function(I,E){var K=["ms","moz","webkit","o"];function A(M){var L=M.charAt(0).toUpperCase()+M.substring(1);return[M].concat(I.map(K,function(N){return N+L}))}var G=I.once(function(){try{window.localStorage.setItem("___stash_test","true");window.localStorage.removeItem("___stash_test");return true}catch(L){console&&console.log("Note: localStorage not supported in this browser.");return false}});var B=I.once(function(){var L=document.createElement("canvas");return(typeof L.getContext==="function")&&!!L.getContext("2d")});var H=I.once(function(){return"a1a".split(/(\d)/).length===3});var D=I.once(function(){return I.find(A("transform"),function(L){return document.body.style[L]!==undefined})});var F=I.once(function(){return"classList" in document.documentElement});var J={"pointer-events":function(){var L=document.createElement("x");L.style.cssText="pointer-events:auto";return L.style.pointerEvents==="auto"}};(function C(L){var M=document.documentElement;I.forEach(L,function(O,N){O()&&(F()?M.classList.add(N):M.className+=" "+N)})})(J);E.localStorage=G;E.canvas=B;E.splitCapture=H;E.cssTransform=D});