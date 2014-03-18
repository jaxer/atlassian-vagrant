/*
 * jQuery hashchange event - v1.3 - 7/21/2010
 * http://benalman.com/projects/jquery-hashchange-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function($,E,B){var C="hashchange",H=document,F,G=$.event.special,I=H.documentMode,D="on"+C in E&&(I===B||I>7);function A(J){J=J||location.href;return"#"+J.replace(/^[^#]*#?(.*)$/,"$1")}$.fn[C]=function(J){return J?this.bind(C,J):this.trigger(C)};$.fn[C].delay=50;G[C]=$.extend(G[C],{setup:function(){if(D){return false}$(F.start)},teardown:function(){if(D){return false}$(F.stop)}});F=(function(){var J={},P,M=A(),K=function(Q){return Q},L=K,O=K;J.start=function(){P||N()};J.stop=function(){P&&clearTimeout(P);P=B};function N(){var R=A(),Q=O(M);if(R!==M){L(M=R,Q);$(E).trigger(C)}else{if(Q!==M){location.href=location.href.replace(/#.*/,"")+Q}}P=setTimeout(N,$.fn[C].delay)}$.browser.msie&&!D&&(function(){var Q,R;J.start=function(){if(!Q){R=$.fn[C].src;R=R&&R+A();Q=$('<iframe tabindex="-1" title="empty"/>').hide().one("load",function(){R||L(A());N()}).attr("src",R||"javascript:0").insertAfter("body")[0].contentWindow;H.onpropertychange=function(){try{if(event.propertyName==="title"){Q.document.title=H.title}}catch(S){}}}};J.stop=K;O=function(){return A(Q.location.href)};L=function(V,S){var U=Q.document,T=$.fn[C].domain;if(V!==S){U.title=H.title;U.open();T&&U.write('<script>document.domain="'+T+'"<\/script>');U.close();Q.location.hash=V}}})();return J})()})(jQuery,this);