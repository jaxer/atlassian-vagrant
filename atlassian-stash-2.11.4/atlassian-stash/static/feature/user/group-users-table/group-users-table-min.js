define("feature/user/group-users-table",["jquery","underscore","util/ajax","util/function","util/navbuilder","widget/paged-table","feature/user/user-multi-selector"],function(F,K,J,I,A,G,C){var B=".users-multi-selector";var D=".add-button";var H=".delete-button";function E(L){G.call(this,F.extend({filterable:false,noneFoundMessageHtml:stash_i18n("stash.web.users.group.members.none","This group has no users"),idForEntity:I.dot("name")},L));this.group=this.$table.attr("data-group");this.$notifications=this.$table.prev(".notifications");this._initBindings=K.once(this._initBindings)}F.extend(E.prototype,G.prototype);E.prototype.init=function(){G.prototype.init.call(this);this._initBindings()};E.prototype.buildUrl=function(O,L,M){var N={context:this.group,start:O,limit:L,avatarSize:stash.widget.avatarSizeInPx({size:"small"})};return A.admin().groups().addPathComponents("more-members").withParams(N).build()};E.prototype.handleNewRows=function(L,M){this.$table.find("tbody")[M](stash.feature.user.groupUserRows({page:L}))};E.prototype.handleErrors=function(M){var L=this.$notifications.empty();K.each(M,function(N){L.append(aui.message.error({content:AJS.escapeHtml(N.message)}))})};E.prototype.remove=function(N){var M=this;if(G.prototype.remove.call(this,N)){var L=this.$table.find("tbody > tr[data-name]").filter(function(){return F(this).attr("data-name")===N.name});L.fadeOut("fast",function(){L.remove();M.updateTimestamp()})}};E.prototype._initBindings=function(){var L=this;var M=new C(F(B,L.$table),{url:A.admin().groups().addPathComponents("more-non-members").withParams({context:L.group}).build()});L.$table.on("click",D,function(O){O.preventDefault();var P=M.getSelectedItems();var N=K.pluck(P,"name");L._addUsers(L.group,N).done(function(){M.clearSelectedItems();L.add(K.map(P,function(Q){return F.extend({justAdded:true},Q)}))}).fail(function(S,T,Q,R){L.handleErrors(L._extractErrors(R))})});L.$table.on("click",H,function(N){N.preventDefault();var O=F(N.target).closest("a").attr("data-for");L._removeUser(L.group,O).done(function(){L.remove({name:O})}).fail(function(R,S,P,Q){L.handleErrors(L._extractErrors(Q))})})};E.prototype._addUsers=function(L,M){return J.rest({data:{group:L,users:M},statusCode:{"403":false,"404":false,"500":false},type:"POST",url:A.admin().groups().addPathComponents("add-users").build()})};E.prototype._removeUser=function(L,M){return J.rest({data:{context:L,itemName:M},statusCode:{"403":false,"404":false,"409":false,"500":false},type:"POST",url:A.admin().groups().addPathComponents("remove-user").build()})};E.prototype._extractErrors=function(L){return L&&L.errors&&L.errors.length?L.errors:[{message:AJS.escapeHtml(stash_i18n("stash.web.users.group.unknown.error","An unknown error has occurred"))}]};return E});