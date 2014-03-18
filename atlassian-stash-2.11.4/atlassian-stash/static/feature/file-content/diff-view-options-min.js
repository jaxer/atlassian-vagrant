define("feature/file-content/diff-view/diff-view-options",["util/deprecation","feature/file-content/diff-view-options"],function(B,A){B.getMessageLogger("feature/file-content/diff-view/diff-view-options","feature/file-content/diff-view-options","2.11","3.0")();return A});define("feature/file-content/diff-view-options",["underscore","util/deprecation","util/events","util/client-storage"],function(B,E,D,A){var F=B.memoize(function(){return A.buildKey(["diff-view","options"],"user")});function C(){}C.prototype.getOptions=B.memoize(function(){return B.extend({},this.defaults,A.getItem(F()))});C.prototype.defaults={ignoreWhitespace:false,diffType:"unified"};C.prototype.triggerUpdate=function(G,H){D.trigger("stash.feature.fileContent.optionsChanged",null,{key:G,value:H});E.triggerDeprecated("stash.feature.diffview.optionsChanged",undefined,"stash.feature.fileContent.optionsChanged","2.11","3.0")};C.prototype.set=function(G,H,I){this.getOptions()[G]=H;A.setItem(F(),this.getOptions());if(I!==false){this.triggerUpdate(G,H)}};C.prototype.get=function(G){return this.getOptions()[G]};return new C()});