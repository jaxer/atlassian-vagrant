define("feature/project/project-selector",["jquery","underscore","model/project","util/events","util/navbuilder","widget/searchable-selector"],function(G,D,F,E,C,A){function B(I,H){return this.init.apply(this,arguments)}G.extend(B.prototype,A.prototype);B.prototype.defaults=G.extend(true,{},A.prototype.defaults,{url:function(){return C.allProjects().withParams({avatarSize:stash.widget.avatarSizeInPx({size:"xsmall"}),permission:"PROJECT_ADMIN"}).build()},searchable:true,queryParamKey:"name",extraClasses:"project-selector",resultsTemplate:stash.feature.project.projectSelectorResults,triggerContentTemplate:stash.feature.project.projectSelectorTriggerContent,searchPlaceholder:"Search for a project",namespace:"project-selector",itemSelectedEvent:"stash.feature.project.projectSelector.projectChanged",itemDataKey:"project"});B.constructDataPageFromPreloadArray=A.constructDataPageFromPreloadArray;B.prototype._getItemFromTrigger=function(){var H=this.$trigger.find(".project");return new F(this._buildObjectFromElementDataAttributes(H))};B.prototype.setSelectedItem=function(H){if(H instanceof F&&!H.isEqual(this._selectedItem)){this._itemSelected(H)}};B.prototype._itemSelected=function(H){var I;if(H instanceof F){I=H;H=H.toJSON()}else{H=D.pick(H,D.keys(F.prototype.namedAttributes));I=new F(H)}this._selectedItem=I;if(this._getOptionVal("field")){G(this._getOptionVal("field")).val(I.getId())}this.updateTrigger({project:H});E.trigger(this._getOptionVal("itemSelectedEvent"),this,I,this._getOptionVal("context"))};return B});