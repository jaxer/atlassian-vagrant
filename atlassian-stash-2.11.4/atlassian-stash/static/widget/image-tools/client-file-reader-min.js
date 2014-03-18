define("widget/image-tools/client-file-reader",["jquery","underscore","widget/image-tools/client-file-handler"],function(E,D,B){var F=!!(window.File&&window.FileList&&window.FileReader);var C={ArrayBuffer:"readAsArrayBuffer",BinaryString:"readAsBinaryString",DataURL:"readAsDataURL",Text:"readAsText"};function A(G){if(!A.isSupported()){throw new Error("ClientFileReader requires FileReaderAPI support")}return this.init(G)}A.isSupported=function(){return F};E.extend(A.prototype,B.prototype);A.readMethods={ArrayBuffer:"ArrayBuffer",BinaryString:"BinaryString",DataURL:"DataURL",Text:"Text"};A.typeFilters=B.typeFilters;A.prototype.defaults=E.extend({},B.prototype.defaults,{readMethod:A.readMethods.DataURL,onRead:E.noop});A.prototype.init=function(G){D.bindAll(this,"onSuccess","readFile");B.prototype.init.call(this,G);this.options.onSuccess=this.onSuccess;return this};A.prototype.onSuccess=function(H){var G=D.has(C,this.options.readMethod)?C[this.options.readMethod]:undefined;if(G){D.each(H,D.bind(function(J){var I=new FileReader();I.onload=D.bind(this.readFile,this,J);I[G](J)},this))}};A.prototype.readFile=function(G,H){D.isFunction(this.options.onRead)&&this.options.onRead(H.target.result,G)};return A});