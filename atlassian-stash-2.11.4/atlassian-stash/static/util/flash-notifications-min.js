define("util/flash-notifications",["aui","jquery","underscore","util/client-storage","exports"],function(C,G,D,A,B){var H="flash-notifications";function F(){return A.getFlashItem(H)}function E(I){if(I&&I.length){A.setFlashItem(H,I)}else{A.removeFlashItem(H)}}B.getItem=function(J){var K;var I=F();if(I&&D.has(I,J)){K=I[J];delete I[J]}E(I);return K||null};B.addNotification=function(K,J){J=J||"success";var I=F()||[];I.push({message:K,type:J});E(I)};B.attachNotifications=function(J,K){K=K||"append";var I=D.map(B.drainNotifications(),function(L){return aui.message.message({content:C.escapeHtml(L.message),type:L.type})}).join("");if(I){G(J)[K](I)}};B.drainNotifications=function(){return F()}});