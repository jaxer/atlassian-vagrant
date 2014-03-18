define('feature/repository/branch-table', [
    'aui',
    'jquery',
    'underscore',
    'util/events',
    'util/navbuilder',
    'model/page-state',
    'widget/paged-table'
], function(
    AJS,
    $,
    _,
    events,
    nav,
    pageState,
    PagedTable) {

    'use strict';

    function validateRef(ref) {
        if (!ref) {
            throw new Error("Undefined ref");
        } else if (!ref.id) {
            throw new Error("Ref without id");
        }
        return ref;
    }

    function BranchTable(options, baseRef) {
        PagedTable.call(this, $.extend({}, BranchTable.defaults, options));
        this._baseRef = validateRef(baseRef);
    }

    BranchTable.defaults = {
        filterable: true,
        pageSize: 20, // this must be less than ref.metadata.max.request.count
        noneFoundMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.repository.branch.table.no.branches', 'No branches')),
        noneMatchingMessageHtml: AJS.escapeHtml(stash_i18n('stash.web.repository.branch.table.no.matches', 'No branches match')),
        idForEntity: function(ref) {
            return ref.id;
        }
    };

    $.extend(BranchTable.prototype, PagedTable.prototype);

    BranchTable.prototype.buildUrl = function (start, limit, filter) {
        var params = {
            base: this._baseRef.id,
            details: true,
            start: start,
            limit: limit,
            orderBy: 'MODIFICATION' // Always order by last modified regardless of filtering
        };

        if (filter) {
            params.filterText = filter;
        }

        return nav.rest().currentRepo()
            .branches()
            .withParams(params)
            .build();
    };

    BranchTable.prototype.handleNewRows = function (branchPage, attachmentMethod) {
        this.$table.find('tbody')[attachmentMethod](stash.feature.repository.branchRows({
            branches: branchPage.values,
            baseRef: this._baseRef,
            repository: pageState.getRepository().toJSON()
        }));
    };

    BranchTable.prototype.isCurrentBase = function (ref) {
        return this._baseRef.id === validateRef(ref).id;
    };

    BranchTable.prototype.update = function (baseRef, options) {
        if (baseRef) {
            this._baseRef = validateRef(baseRef);
        }
        PagedTable.prototype.update.call(this, options);
    };

    BranchTable.prototype.remove = function(ref) {
        if (PagedTable.prototype.remove.call(this, ref)) {
            var $row = this.$table.find('tbody > tr[data-id="' + ref.id + '"]');
            $row.fadeOut(_.bind(function() {
                if ($row.hasClass('focused')) {
                    var $nextRow = $row.next();
                    var $nextFocus = $nextRow.length ? $nextRow : $row.prev();
                    if ($nextFocus.length) {
                        $nextFocus.addClass('focused');
                        $nextFocus.find('td[headers=branch-name-column] > a').focus();
                    }
                }
                $row.remove();

                // Ensure we display the no data message when
                // the last row is deleted
                if (this.loadedRange.reachedStart() &&
                    this.loadedRange.reachedEnd() && !(this.$table.find('tbody > tr').length)) {
                    this.handleNoData();
                }

                this.updateTimestamp();
            }, this));
            return true;
        }
        return false;
    };

    BranchTable.prototype.initShortcuts = function() {
        PagedTable.prototype.initShortcuts.call(this);

        var tableSelector = this.$table.selector;
        var options = this.options.focusOptions;
        var rowSelector = tableSelector + ' ' + options.rowSelector;

        var focusedRowSelector = rowSelector + '.' + options.focusedClass;

        events.on('stash.keyboard.shortcuts.requestMoveToNextHandler', function(keys) {
            (this.moveToNextItem ? this : AJS.whenIType(keys)).moveToNextItem(rowSelector, options).execute(function() {
                if ($(rowSelector).last().hasClass(options.focusedClass)) {
                    window.scrollTo(0, document.documentElement.scrollHeight);
                }
            });
        });

        events.on('stash.keyboard.shortcuts.requestMoveToPreviousHandler', function(keys) {
            (this.moveToPrevItem ? this : AJS.whenIType(keys)).moveToPrevItem(rowSelector, options);
        });

        events.on('stash.keyboard.shortcuts.requestOpenItemHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                var $focusedItem = $(focusedRowSelector);
                if ($focusedItem.length) {
                    location.href = $focusedItem.find('td[headers=branch-name-column] > a').attr('href');
                }
            });
        });

        events.on('stash.keyboard.shortcuts.requestOpenItemActionHandler', function(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(function() {
                var $focusedItem = $(focusedRowSelector);
                if ($focusedItem.length) {
                    $focusedItem.find('.branch-list-action-trigger').click();
                }
            });
        });

    };

    return BranchTable;

});