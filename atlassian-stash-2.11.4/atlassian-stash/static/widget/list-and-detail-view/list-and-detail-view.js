define('widget/list-and-detail-view', [
    'jquery',
    'underscore'
], function(
    $,
    _
) {

    'use strict';

    var keycodes = {
        j: 74,
        k: 75
    };

    function ListAndDetailView($listAndDetailView, selectHandler, options) {
        this.options = $.extend({}, ListAndDetailView.prototype.defaults, options);
        this.$listView = $listAndDetailView.find('.list-view');
        this.$detailView = $listAndDetailView.find('.detail-view');
        this.selectHandler = selectHandler;
        _.bindAll(this, '_itemClickHandler', '_shortcutHandler');
        this.init();
    }

    ListAndDetailView.prototype.defaults = {
        selectedClass: 'selectedItem'
    };

    ListAndDetailView.prototype.init = function() {
        var self = this;
        this.bindShortcuts();
        this.$listView.on('click', 'li', this._itemClickHandler);
    };

    ListAndDetailView.prototype._itemClickHandler = function(e) {
        var selectedClass = this.options.selectedClass;
        this.$listView.find('li.' + selectedClass).removeClass(selectedClass);
        var $listItem = $(e.currentTarget).addClass(selectedClass);
        this.selectHandler($listItem, this.$listView, this.$detailView, e);
    };

    ListAndDetailView.prototype.destroy = function() {
        this.unbindShortcuts();
    };

    ListAndDetailView.prototype._shortcutHandler = function(e) {
        var nextPrev;
        if (e.which === keycodes.j) {
            nextPrev = 'next';
        } else if (e.which === keycodes.k) {
            nextPrev = 'prev';
        } else {
            return;
        }

        var $selected = this.$listView.find('li.' + this.options.selectedClass);
        var $target = $selected[nextPrev]('li');
        $target.click()
            .find('a').focus().blur();   // Scroll into view if necessary. Will only scroll if there is an <a>
    };

    ListAndDetailView.prototype.bindShortcuts = function() {
        $(document).on('keydown', this._shortcutHandler);
    };

    ListAndDetailView.prototype.unbindShortcuts = function() {
        $(document).off('keydown', this._shortcutHandler);
    };

    return ListAndDetailView;
});