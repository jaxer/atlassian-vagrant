define('widget/infinite-table', [
    'aui',
    'jquery',
    'underscore',
    'util/ajax',
    'util/deprecation',
    'widget/paged-scrollable',
    'widget/loaded-range'
], function(
    AJS,
    $,
    _,
    ajax,
    deprecate,
    PagedScrollable,
    LoadedRange
) {

        /**
         * @deprecated
         */
        function InfiniteTable(tableSelector, options) {
            PagedScrollable.call(this);

            this.$table = $(tableSelector).addClass('infinite-table');

            this.$tbody = this.$table.children('tbody');

            if (!this.$tbody.length) {
                this.$tbody = this.$table;
            }

            this._options = $.extend({}, InfiniteTable.defaults, options);
        }
        $.extend(InfiniteTable.prototype, PagedScrollable.prototype);

        InfiniteTable.prototype.init = function(optPreloadedPage) {

            optPreloadedPage = optPreloadedPage || {
                start : this.$table.data('start'),
                size : this.$table.data('size'),
                isLastPage : this.$table.data('is-last-page'),
                nextPageStart : this.$table.data('next-page-start')
            };

            PagedScrollable.prototype.init.call(this,
                {loadedRange: new LoadedRange().add(
                    optPreloadedPage.start,
                    optPreloadedPage.size,
                    optPreloadedPage.isLastPage,
                    optPreloadedPage.nextPageStart
                )}
            );
        };

        InfiniteTable.prototype.requestData = function(start, limit) {
            var $spinner = $('<div class="spinner"/>');

            this.$table.after($spinner);
            $spinner.spin('large');

            return ajax.rest({
                url : this._options.getRequestUrl(start, limit)
            }).always(function() {
                $spinner.spinStop();
                $spinner.remove();
            });
        };

        InfiniteTable.prototype.attachNewContent = function(data, attachmentMethod) {

            var resultTemplate = this._options.resultTemplate;

            this.$tbody[attachmentMethod](
                _.map(data.values, resultTemplate).join('')
            );

            if (data.isLastPage) {
                $("<p class='no-more-results'/>").text(this._options.noMoreMessage).insertAfter(this.$table);
            }
        };

        InfiniteTable.defaults = {
            getRequestUrl : function(start, limit) {
                AJS.log("getRequestUrl must be specified to use InfiniteTable.");
            },
            noMoreMessage : stash_i18n('stash.web.results.no.more', 'No more results'),
            resultTemplate : function(item) {
                var s = '<tr>';

                for(var key in item) {
                    if (Object.prototype.hasOwnProperty.call(item, key)) {
                        s += '<td>' + AJS.escapeHtml(item[key]) + '</td>';
                    }
                }

                s += '</tr>';

                return s;
            }
        };

        return deprecate.construct(InfiniteTable, 'InfiniteTable', 'widget/paged-table', '2.4', '3.0');
    }
);