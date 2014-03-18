(function(A){if(typeof define==="function"&&define.amd){define(["jquery"],A)}else{A(jQuery)}}(function(E){E.expandingTextarea=E.extend({autoInitialize:true,initialSelector:"textarea.expanding",opts:{resize:function(){}}},E.expandingTextarea||{});var D=["lineHeight","textDecoration","letterSpacing","fontSize","fontFamily","fontStyle","fontWeight","textTransform","textAlign","direction","wordSpacing","fontSizeAdjust","wordWrap","word-break","borderLeftWidth","borderRightWidth","borderTopWidth","borderBottomWidth","paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginRight","marginTop","marginBottom","boxSizing","webkitBoxSizing","mozBoxSizing","msBoxSizing"];var C={position:"absolute",height:"100%",resize:"none"};var F={visibility:"hidden",border:"0 solid",whiteSpace:"pre-wrap"};var B={position:"relative"};function A(){E(this).closest(".expandingText").find("div").text(this.value.replace(/\r\n/g,"\n")+" ");E(this).trigger("resize.expanding")}E.fn.expandingTextarea=function(H){var G=E.extend({},E.expandingTextarea.opts,H);if(H==="resize"){return this.trigger("input.expanding")}if(H==="destroy"){this.filter(".expanding-init").each(function(){var J=E(this).removeClass("expanding-init");var I=J.closest(".expandingText");I.before(J).remove();J.attr("style",J.data("expanding-styles")||"").removeData("expanding-styles")});return this}this.filter("textarea").not(".expanding-init").addClass("expanding-init").each(function(){var J=E(this);J.wrap("<div class='expandingText'></div>");J.after("<pre class='textareaClone'><div></div></pre>");var I=J.parent().css(B);var K=I.find("pre").css(F);J.data("expanding-styles",J.attr("style"));J.css(C);E.each(D,function(L,M){var N=J.css(M);if(K.css(M)!==N){K.css(M,N)}});J.bind("input.expanding propertychange.expanding keyup.expanding",A);A.apply(this);if(G.resize){J.bind("resize.expanding",G.resize)}});return this};E(function(){if(E.expandingTextarea.autoInitialize){E(E.expandingTextarea.initialSelector).expandingTextarea()}})}));