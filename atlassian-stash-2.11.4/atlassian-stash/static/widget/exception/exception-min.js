define("widget/exception",["jquery","exports"],function(B,A){A.onReady=function(){B(".formatted-throwable-toggle").click(function(){var D=B(this);var C=D.next(".formatted-throwable");if(D.data("message-visible")){C.hide("slow",function(){D.text(stash_i18n("stash.web.message.throwable.twixie.show","Show details"))});D.data("message-visible",false)}else{C.show("slow",function(){D.text(stash_i18n("stash.web.message.throwable.twixie.hide","Hide details"))});D.data("message-visible",true)}})}});