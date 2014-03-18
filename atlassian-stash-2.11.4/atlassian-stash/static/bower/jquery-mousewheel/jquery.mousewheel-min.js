/* Copyright (c) 2013 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.1.1
 *
 * Requires: 1.2.2+
 */
(function(A){if(typeof define==="function"&&define.amd){define(["jquery"],A)}else{A(jQuery)}}(function(E){var D=["wheel","mousewheel","DOMMouseScroll"];var G="onwheel" in document||document.documentMode>=9?["wheel"]:["mousewheel","DomMouseScroll","MozMousePixelScroll"];var F,A;if(E.event.fixHooks){for(var B=D.length;B;){E.event.fixHooks[D[--B]]=E.event.mouseHooks}}E.event.special.mousewheel={setup:function(){if(this.addEventListener){for(var H=G.length;H;){this.addEventListener(G[--H],C,false)}}else{this.onmousewheel=C}},teardown:function(){if(this.removeEventListener){for(var H=G.length;H;){this.removeEventListener(G[--H],C,false)}}else{this.onmousewheel=null}}};E.fn.extend({mousewheel:function(H){return H?this.bind("mousewheel",H):this.trigger("mousewheel")},unmousewheel:function(H){return this.unbind("mousewheel",H)}});function C(H){var I=H||window.event,N=[].slice.call(arguments,1),P=0,K=0,J=0,M=0,L=0,O;H=E.event.fix(I);H.type="mousewheel";if(I.wheelDelta){P=I.wheelDelta}if(I.detail){P=I.detail*-1}if(I.deltaY){J=I.deltaY*-1;P=J}if(I.deltaX){K=I.deltaX;P=K*-1}if(I.wheelDeltaY!==undefined){J=I.wheelDeltaY}if(I.wheelDeltaX!==undefined){K=I.wheelDeltaX*-1}M=Math.abs(P);if(!F||M<F){F=M}L=Math.max(Math.abs(J),Math.abs(K));if(!A||L<A){A=L}O=P>0?"floor":"ceil";P=Math[O](P/F);K=Math[O](K/A);J=Math[O](J/A);N.unshift(H,P,K,J);return(E.event.dispatch||E.event.handle).apply(this,N)}}));