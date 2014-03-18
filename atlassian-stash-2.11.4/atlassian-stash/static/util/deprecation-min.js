define("util/deprecation",["util/events","util/text"],function(D,A){var E=Object.prototype.hasOwnProperty;var O=Object.prototype.toString;function C(Y,X,U,V){if(typeof Y==="function"){return Y}var W=false;return function(){if(!W){W=true;var b=A.toSentenceCase(Y)+" has been deprecated"+(U?" since "+U:"")+" and will be removed in "+(V||"a future release")+".";if(X){b+=" Use "+X+" instead."}var a=new Error();var Z=a.stack||a.stacktrace;var c=(Z&&Z.replace(/^Error\n/,""))||"No stack trace of the deprecated usage is available in your current browser.";console.log(b+"\n"+c)}}}function H(X,Z,Y,V,W){var U=C(Z||X.name||"this function",Y,V,W);return function(){U();return X.apply(this,arguments)}}function P(W,Z,Y,U,V){var X=H(W,Z,Y,U,V);X.prototype=W.prototype;return X}var K=false;try{if(Object.defineProperty){Object.defineProperty({},"blam",{get:function(){},set:function(){}});K=true}}catch(Q){}function R(Z,b,a,Y,W,X){if(K){var V=Z[b];var U=C(a||b,Y,W,X);Object.defineProperty(Z,b,{get:function(){U();return V},set:function(c){V=c;U();return c}})}else{}}function G(X,Z,Y,W,U,V){if(typeof X[Z]==="function"){X[Z]=H(X[Z],Y||Z,W,U,V)}else{R(X,Z,Y,W,U,V)}}function B(Z,V,Y,W,X){for(var U in Z){if(E.call(Z,U)){G(Z,U,V+U,Y+U,W,X)}}}var T="id";var F=/^(attributes|url|isNew|hasChanged|changed(Attributes)|previous(Attributes)|clone)$/;function S(Z,Y,V,W,X){if(T===V){return }if(F.test(V)){throw new Error("The property "+V+" cannot be deprecated when converting to a Brace model.")}if(K){var U=C(Y+"::"+V,Y+"::get|set('"+V+"')",W,X);Object.defineProperty(Z.prototype,V,{get:function(){U();return this.get(V)},set:function(a){U();this.set(V,a)}})}else{}}function N(a,Z,W,X){var V=a.prototype.namedAttributes;var U;if(O.call(V)==="[object Array]"){var Y=V.length;while(Y--){S(a,Z,V[Y],W,X)}}else{for(U in V){if(E.call(V,U)){S(a,Z,U,W,X)}}}if(!K){var b=a.prototype.set;a.prototype.set=function(e,d){b.apply(this,arguments);if(e&&typeof e==="object"){for(var c in e){if(E.call(e,c)){this[c]=e[c]}}}else{this[e]=d}}}}function J(Z,X,Y,V,W){if(E.call(Z.prototype.namedAttributes,X)){var U=A.toSentenceCase(X);Z.prototype["get"+U]=H(Z.prototype["get"+U],X,Y,V,W);Z.prototype["set"+U]=H(Z.prototype["set"+U],X,Y,V,W)}}function M(W,V,X){W=W.clone();var Y=W.toJSON();var U;var Z=C("use of this object's Backbone properties","raw JSON properties on this object",V,X);for(U in W){if(!E.call(Y,U)){G(W,U,Z)}}for(U in Y){if(E.call(Y,U)){W[U]=Y[U]}}return W}var I={};function L(W,Y){if(D.listeners(W).length){if(arguments.length<5){throw new Error("eventName, context, alternativeName, sinceVersion, and removeInVersion must all be provided (but can be null).")}var U=Array.prototype.slice.call(arguments,0,arguments.length-3);var Z=arguments[arguments.length-3];var V=arguments[arguments.length-2];var X=arguments[arguments.length-1];var a=I[W]||(I[W]=C("Event '"+W+"'","'"+Z+"'",V,X));a();D.trigger.apply(D,U)}}return{fn:H,construct:P,prop:G,obj:B,braceAsJson:N,braceAttribute:J,jsonAsBrace:M,triggerDeprecated:L,propertyDeprecationSupported:K,getMessageLogger:C}});