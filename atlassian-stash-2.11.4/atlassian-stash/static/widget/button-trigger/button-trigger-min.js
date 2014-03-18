define("widget/button-trigger",["jquery","underscore"],function(C,B){var D={triggerEvent:"click",stopEvent:true,triggerHandler:function(F,E){throw new Error("triggerHandler must be implemented")}};function A(G,F){this._opts=C.extend({},D,F);var E=this;this._$trigger=C(G).on(this._opts.triggerEvent,B.bind(this.triggerClicked,E))}A.prototype.setTriggerDisabled=function(E){this._$trigger.attr("aria-disabled",E===undefined?true:!!E)};A.prototype.isTriggerDisabled=function(){return this._$trigger.attr("aria-disabled")==="true"};A.prototype.setTriggerActive=function(E){this._$trigger.attr("aria-pressed",E===undefined?true:!!E)};A.prototype.isTriggerActive=function(){return this._$trigger.attr("aria-pressed")==="true"};A.prototype.triggerClicked=function(E){var F=this.isTriggerActive();if(this.isTriggerDisabled()){if(this._opts.stopEvent){E&&E.stopPropagation&&E.stopPropagation();return false}return }this._opts.triggerHandler.call(this,!F,E);if(this._opts.stopEvent){E&&E.stopPropagation&&E.stopPropagation();return false}};return A});