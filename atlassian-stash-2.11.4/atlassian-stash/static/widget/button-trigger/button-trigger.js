define('widget/button-trigger', [
    'jquery',
    'underscore'
], function(
    $,
    _
    ) {

    'use strict';

    var defaults = {
        triggerEvent: 'click',
        stopEvent: true,
        triggerHandler: function (value, event) {
            throw new Error("triggerHandler must be implemented");
        }
    };

    function ButtonTrigger(selectorTrigger, opts) {
        this._opts = $.extend({}, defaults, opts);

        var self = this;

        this._$trigger = $(selectorTrigger).on(this._opts.triggerEvent, _.bind(this.triggerClicked, self));
    }

    ButtonTrigger.prototype.setTriggerDisabled = function (toggle) {
        this._$trigger.attr('aria-disabled', toggle === undefined ? true : !!toggle);
    };

    ButtonTrigger.prototype.isTriggerDisabled = function () {
        return this._$trigger.attr('aria-disabled') === 'true';
    };

    ButtonTrigger.prototype.setTriggerActive = function (toggle) {
        this._$trigger.attr('aria-pressed', toggle === undefined ? true : !!toggle);
    };

    ButtonTrigger.prototype.isTriggerActive = function () {
        return this._$trigger.attr('aria-pressed') === 'true';
    };

    ButtonTrigger.prototype.triggerClicked = function (event) {

        var isOn = this.isTriggerActive();

        if (this.isTriggerDisabled()) {
            if (this._opts.stopEvent) {
                event && event.stopPropagation && event.stopPropagation();
                return false;
            }
            return;
        }

        this._opts.triggerHandler.call(this, !isOn, event);

        if (this._opts.stopEvent) {
            event && event.stopPropagation && event.stopPropagation();
            return false;
        }
    };

    return ButtonTrigger;
});
