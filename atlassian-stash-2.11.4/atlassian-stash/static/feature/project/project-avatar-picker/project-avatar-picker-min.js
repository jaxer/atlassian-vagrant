define("feature/project/project-avatar-picker",["jquery","widget/avatar-picker-dialog"],function(B,C){function A(D,E){this.init.apply(this,arguments)}A.prototype.init=function(D,E){this.$container=B(D);var H=this.$container.find(".project-avatar-preview .aui-avatar-project img");var I=this.$container.find(".project-avatar-upload input[name=avatar]");var G=this.$container.find(".project-avatar-upload button");if(!H.attr("src")){B('<div class="project-avatar-default-preview"></div>').insertAfter(H)}if(C.isSupported()){var F=new C({dialogTitle:stash_i18n("stash.web.project.avatar.picker.title","Upload a project avatar"),trigger:G,onCrop:function(J){H.attr("src",J);I.val(J)}})}else{G.attr("disabled","disabled");this.$container.find(".project-avatar-upload").append('<div class="description">'+stash_i18n("stash.web.project.avatar.picker.description","Avatar uploads are supported with IE9+, Chrome, Firefox, or Safari.{0}Please upgrade to choose an avatar.","<br />")+"</div>")}};return A});