define("feature/pull-request/pull-request-metadata-generator",["jquery","util/text","model/revision-reference","exports"],function(D,F,H,C){var G=(D("<div>").text("\n").text().length===1);function E(J){return F.convertBranchNameToSentence((J instanceof H)?J.getDisplayId():J)}function I(L){if(!G){return }var K="",J=D(L).filter(":not(.merge)"),M=_.bind(B,null,J.length>1);if(J.length){K=_.map(J,M).reverse().join("").replace(/\n+/g,"\n")}return K}function B(K,J){var L=D(J).find(".message span").text();return(K?A(L):L)}function A(K){var J=/\n([ \t]*([\*\+\-]|\d+\.)\s)/g,L="\n"+F.indent("$1");return"\n* "+K.replace(J,L)}C.generateTitleFromBranchName=E;C.generateDescriptionFromCommitsTableRows=I});