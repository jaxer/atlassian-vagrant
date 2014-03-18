define('widget/autocomplete-dialog', [
    'backbone',
    'jquery',
    'underscore'
], function(
    Backbone,
    $,
    _
    ) {

    'use strict';

    var isIE8 = ($.browser.msie && parseInt($.browser.version, 10) === 8);

    return Backbone.View.extend({
        className: 'aui-dropdown2 aui-style-default' + (!isIE8 ? ' aui-dropdown2-tailed' : ''),
        initialize: function() {
            var minZIndex = parseInt(this.options.minZIndex, 10);

            if (minZIndex) {
                this.$el.css('z-index', minZIndex + 1);
            }

            $(document.body).append(this.el);

            if (this.options.anchor) {
                this.updateAnchorPosition(this.options.anchor);
            }

            this.template = this.options.template || $.noop;
            this.highlighter = this.options.highlighter;
            this.collection = this.collection || new Backbone.Collection();
            this.collection.bind('reset', this.render, this);
            this.render();
        },
        events: {
            'click li.result': 'onClickItem'
        },
        render: function(){
            var results = this.collection.toJSON(),
                query = this.collection.query,
                activeItemIndex = this.collection.indexOf(this.selectedResult);

            //Template is supplied by caller
            var $html = $(this.template({
                query: query,
                results: results,
                activeItemIndex: (activeItemIndex >= 0) ? activeItemIndex : 0
            }));

            if (query && results.length && _.isFunction(this.highlighter)) {
                $html = this.highlighter($html, query);
            }

            this.$el.html($html);

            if (this.$spinner) {
                //we were spinning previously, so re-add the spinner
               this.$spinner.appendTo(this.$('ul'));
            }

            return this;
        },
        toggleSpinner: function(toggle) {
            if (toggle) {
                if (!this.$spinner) {
                    this.$spinner = $('<li/>').addClass("spinContainer").appendTo(this.$('ul')).spin('small');
                }
            } else {
                this.$spinner && this.$spinner.spinStop().remove();
                this.$spinner = null;
            }
        },
        moveSelectionUp: function() {
            this.moveSelection(this.DIRECTION_UP);
        },
        moveSelectionDown: function() {
            this.moveSelection(this.DIRECTION_DOWN);
        },
        moveSelection: function (direction) {
            var $items = this.$('li');

            if ($items.length <= 1) {
                return;
            }

            var $currentHighlight = $items.filter('.active'),
                index = $.inArray($currentHighlight.get(0), $items),
                activeClass = 'active';

            if ((direction === this.DIRECTION_DOWN) ? (index < $items.length -1) : (index > 0)) {
                index = index + direction;
                $items.removeClass(activeClass).eq(index).addClass(activeClass);
                this.selectedResult = this.collection.at(index);
            }
        },
        getSelectedItemIndex: function() {
            return this.$('li.active').index();
        },
        onClickItem: function(e) {
            this.trigger('itemSelected', this.$(e.currentTarget).index());
        },
        anchorOptions: {
            dropdownTailBufferLeft: 25,   //Left margin on tail + half width of tail
            dropdownTailBufferRight: 35,  //Need to shift the entire tail past the anchor when right anchored.
            viewportWidth: $(window).width(),
            bufferTop: !isIE8 ? 2 : 5    //IE8 has no tail, so needs a bigger buffer
        },
        updateAnchorPosition: function(anchor) {
            //Align left (dropdown extends to the right) unless it won't fit on screen.
            if (this.anchorOptions.viewportWidth - anchor.left > this.$el.outerWidth()) {
                this.$el.css({'top': anchor.top + this.anchorOptions.bufferTop, 'left': anchor.left - this.anchorOptions.dropdownTailBufferLeft})
                        .attr('data-dropdown2-alignment', 'left');
            } else {
                this.$el.css({'top': anchor.top + this.anchorOptions.bufferTop, 'left': anchor.left - this.$el.outerWidth() + this.anchorOptions.dropdownTailBufferRight})
                        .attr('data-dropdown2-alignment', 'right');
            }

        },
        DIRECTION_UP    : -1,
        DIRECTION_DOWN  : 1
    });
});
