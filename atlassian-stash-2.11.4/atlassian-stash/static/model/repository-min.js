define("model/repository",["backbone-brace","model/project","util/deprecation"],function(B,D,C){var A=B.Model.extend({namedAttributes:{id:"number",name:"string",slug:"string",project:D,"public":"boolean",scmId:"string",state:"string",statusMessage:"string",forkable:"boolean",cloneUrl:"string",link:Object,links:Object,origin:null},isEqual:function(E){return !!(E&&E instanceof A&&this.id===E.id)}});B.Mixins.applyMixin(A,{namedAttributes:{origin:A}});C.braceAsJson(A,"Repository","2.4","3.0");return A});