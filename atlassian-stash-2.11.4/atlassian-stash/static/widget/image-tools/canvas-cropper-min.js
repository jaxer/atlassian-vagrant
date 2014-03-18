define("widget/image-tools/canvas-cropper",["jquery","util/feature-detect"],function(C,A){function B(E,D){if(!B.isSupported()){throw new Error("This browser doesn't support CanvasCropper.")}return this.init.apply(this,arguments)}B.isSupported=A.canvas;B.prototype.defaults={outputFormat:"image/png",backgroundFillColor:undefined};B.prototype.init=function(E,D,F){this.width=E;this.height=D||E;this.options=C.extend({},this.defaults,F);this.canvas=C("<canvas/>").attr("width",this.width).attr("height",this.height)[0];return this};B.prototype.cropToDataURI=function(H,G,F,E,D){return this.crop(H,G,F,E,D).getDataURI(this.options.outputFormat)};B.prototype.crop=function(G,F,E,N,O){var D=this.canvas.getContext("2d"),L=0,J=0,K=this.width,H=this.height;D.clearRect(L,J,K,H);if(this.options.backgroundFillColor){D.fillStyle=this.options.backgroundFillColor;D.fillRect(L,J,K,H)}if(F<0){L=Math.round((Math.abs(F)/N)*K);F=0}if(E<0){J=Math.round((Math.abs(E)/O)*H);E=0}if(F+N>G.naturalWidth){var M=G.naturalWidth-F;K*=M/N;N=M}if(E+O>G.naturalHeight){var I=G.naturalHeight-E;H*=I/O;O=I}D.drawImage(G,F,E,N,O,L,J,K,H);return this};B.prototype.getDataURI=function(D){if(D){return this.canvas.toDataURL(D)}else{return null}};return B});