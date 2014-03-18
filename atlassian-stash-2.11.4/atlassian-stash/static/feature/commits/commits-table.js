define('feature/commits/commits-table', [
    'jquery',
    'aui',
    'util/events',
    'widget/paged-table'
], function(
    $,
    AJS,
    events,
    PagedTable
) {

        function CommitTable(getCommitsUrlBuilder, options) {
            this.getCommitsUrlBuilder = getCommitsUrlBuilder;

            var defaults = {
                target: "#commits-table",
                ajaxDataType: 'html',
                tableMessageClass: 'commits-table-message',
                allFetchedMessageHtml: '<p class="no-more-results">' + AJS.escapeHtml(stash_i18n('stash.web.commits.allcommitsfetched', 'No more history')) + '</p>',
                noneFoundMessageHtml: '<h3 class="no-results entity-empty">' + AJS.escapeHtml(stash_i18n('stash.web.commits.nocommitsfetched', 'No history found')) + '</h3>'
            };
            options = $.extend({}, defaults, options);

            PagedTable.call(this, options);

            this.$spinner.addClass('commits-table-spinner');
        }

        $.extend(CommitTable.prototype, PagedTable.prototype);

        CommitTable.prototype.buildUrl = function (start, limit) {
            return this.getCommitsUrlBuilder()
                .withParams({
                    start : start,
                    limit : limit,
                    contents: ''
                }).build();
        };

        CommitTable.prototype.onDataLoaded = function(start, limit, data) {
            if (typeof data === 'string') {
                // real ajax request
                data = this.createDataFromJQuery(start, limit, $(data));
            }
            return PagedTable.prototype.onDataLoaded.call(this, start, limit, data);
        };

        CommitTable.prototype.attachNewContent = function (data, attachmentMethod) {
            PagedTable.prototype.attachNewContent.call(this, data, attachmentMethod);

            events.trigger('stash.widget.commitsTable.contentAdded', this, data);
        };

        CommitTable.prototype.handleNewRows = function (data, attachmentMethod) {
            this.$table.show().children("tbody")[attachmentMethod !== 'html' ? attachmentMethod : 'append'](data.values);
        };

        CommitTable.prototype.focusInitialRow = function() {
            this.$table.find("tbody tr.commit-row:first").addClass("focused-commit");
        };

        CommitTable.prototype.initShortcuts = function() {
            var self = this,
                sel = this.$table.selector,
                openItemDisabled = false,
                options = {
                    "focusedClass": "focused-commit",
                    "wrapAround": false,
                    "escToCancel": false
                },
                focusedRowSelector = sel + " .commit-row." + options.focusedClass,
                rowSelector = focusedRowSelector + ", " +               //Always include the currently selected element, even if it's a filtered merge row
                sel + ".show-merges .commit-row, " +                    //When not filtering merges, include every row
                sel + ":not(.show-merges) .commit-row:not(.merge)";     //When filtering merges, don't include merge rows

            this._onDisableOpenItemHandler = function(){
                openItemDisabled = true;
            };
            this._onEnableOpenItemHandler = function(){
                openItemDisabled = false;
            };
            events.on('stash.keyboard.shortcuts.disableOpenItemHandler', this._onDisableOpenItemHandler);
            events.on('stash.keyboard.shortcuts.enableOpenItemHandler', this._onEnableOpenItemHandler);

            this.bindMoveToNextHandler = function(keys) {
                (this.moveToNextItem ? this : AJS.whenIType(keys)).moveToNextItem(rowSelector, options).execute(function() {
                    if ($(rowSelector).last().hasClass(options.focusedClass)) {
                        window.scrollTo(0, document.documentElement.scrollHeight);
                    }
                });
            };

            this.bindMoveToPreviousHandler = function(keys) {
                (this.moveToPrevItem ? this : AJS.whenIType(keys)).moveToPrevItem(rowSelector, options);
            };

            this.bindOpenItemHandler = function(keys) {
                (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                    if (!openItemDisabled) {
                        var $focusedItem = AJS.$(focusedRowSelector);
                        if ($focusedItem.length) {
                            window.location.href = $focusedItem.find('td.changeset a').attr('href');
                        }
                    }
                });
            };

            this.bindToggleMergesHandler = function(keys) {
                (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                    self.$table.toggleClass("show-merges");
                });
            };

            PagedTable.prototype.initShortcuts.call(this);
        };
        CommitTable.prototype.resetShortcuts = function() {
            PagedTable.prototype.resetShortcuts.call(this);
            events.off('stash.keyboard.shortcuts.disableOpenItemHandler', this._onDisableOpenItemHandler);
            events.off('stash.keyboard.shortcuts.enableOpenItemHandler', this._onEnableOpenItemHandler);
        };

        return CommitTable;
    });
