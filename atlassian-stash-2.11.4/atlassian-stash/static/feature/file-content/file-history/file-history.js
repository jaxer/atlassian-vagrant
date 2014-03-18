define('feature/file-content/file-history',
    ['jquery', 'underscore', 'util/events', 'widget/paged-scrollable', 'model/revision', 'util/ajax', 'util/navbuilder'],
    function($, _, events, PagedScrollable, Revision, ajax, navbuilder) {

    function FileHistory(historyButtonSelector, id) {
        var $historyButton = this._$historyButton = $(historyButtonSelector);
        this._id = id;
        this._scrollPaneSelector = '#inline-dialog-' + id + ' .file-history';
        this._listSelector = this._scrollPaneSelector + " > ul";

        var self = this;
        var hideOnEscapeKeyUp = function(e) {
                if(e.keyCode === $.ui.keyCode.ESCAPE) {
                    self.hide();
                    e.preventDefault();
                }
            },
            showOnClick = function(e) {
                if (self.isButtonEnabled()) {
                    self.show();
                }
                e.preventDefault();
            },
            hideOnClick = function(e) {
                self.hide();
                e.preventDefault();
            },
            itemClicked = this._itemClicked = function(e) {
                self.hide();

                var $li = $(this),
                    $a = $li.children('a'),
                    csid = $a.attr('data-id'),
                    changeset = self._visibleChangesets[csid],
                    revision = new Revision(changeset);

                events.trigger('stash.feature.filehistory.revisionSelected', self, revision);

                e.preventDefault();
            };
        var scrollable = null,
            _dialogInitialised = false,
            $currentContent;

        var onShowDialog = function ($content, trigger, showPopup) {
            if (!_dialogInitialised) {
                _dialogInitialised = true;

                $currentContent = $content.html(stash.feature.fileContent.fileHistory());
                $currentContent.on('click', 'li.changeset-list-item', itemClicked);

                showPopup();
                scrollable = self._createScrollable();
                self._visibleChangesets = {};
                setTimeout(function() {
                    $content.find('.spinner').spin();
                    scrollable.init();
                }, 0);
            } else {
                showPopup();
                _.defer(function () {
                    $(self._listSelector).find(':first a').focus();
                });
            }

            $historyButton.off('click', showOnClick);
            $historyButton.on('click', hideOnClick);
            $(document).on('keyup', hideOnEscapeKeyUp);
        };

        var onHideDialog = function () {
            $(document).off('keyup', hideOnEscapeKeyUp);
            $historyButton.off('click', hideOnClick);
            $historyButton.on('click', showOnClick);
            if ($(document.activeElement).closest(self._scrollPaneSelector).length) {
                // if the focus is inside the dialog, you get stuck when it closes.
                document.activeElement.blur();
            }
        };

        var resetDialog = function () {
            self.hide();
            scrollable && scrollable.reset();
            $(document).off('keyup', hideOnEscapeKeyUp);
            $currentContent && $currentContent.off('click', 'li.changeset-list-item', itemClicked);
            _dialogInitialised = false;
        };

        this._inlineDialog = AJS.InlineDialog($historyButton, id, onShowDialog, {
            hideDelay: 1000,
            width : 420,
            noBind: true,
            hideCallback: onHideDialog
        });

        $historyButton.on('click', showOnClick);

        events.on('stash.page.*.revisionRefChanged', resetDialog);
        events.on('stash.page.*.pathChanged', resetDialog);
    }

    FileHistory.prototype.init = function(path, selectedRevisionReference, headRevisionReference) {
        this._path = path;
        this._selectedRevisionRef = selectedRevisionReference;
        this._headRevisionRef = headRevisionReference;
    };

    FileHistory.prototype.destroy = function () {
        this._inlineDialog.remove();
    };

    FileHistory.prototype.show = function() {
        this._inlineDialog.show();
        $(this._listSelector).find(':first a').focus();
    };

    FileHistory.prototype.hide = function() {
        this._inlineDialog.hide();
    };

    FileHistory.prototype._createScrollable = function() {
        var scrollable = new PagedScrollable(this._scrollPaneSelector, { bufferPixels : 0, pageSize : 25 });
        scrollable.requestData = $.proxy(this.requestData, this);
        scrollable.attachNewContent = $.proxy(this.attachNewContent, this);

        var oldOnFirstDataLoaded = scrollable.onFirstDataLoaded;
        var self = this;
        scrollable.onFirstDataLoaded = function() {
            $(self._listSelector).find(':first a').focus();
            return oldOnFirstDataLoaded.apply(this, arguments);
        };

        return scrollable;
    };

    FileHistory.prototype.requestData = function(start, limit) {
        this._inlineDialog.find('.spinner').spin();
        return ajax.rest({
            url : navbuilder.rest()
                .currentRepo()
                .commits()
                .withParams({
                    path: this._path.toString(),
                    until: this._headRevisionRef.getId(),
                    start : start, limit : limit,
                    avatarSize : stash.widget.avatarSizeInPx({ size: 'xsmall' })
                })
                .build()
        });
    };

    function addChangesetsToMap(changesets, cache) {
        _.forEach(changesets, function(changeset) {
            cache[changeset.id] = changeset;
        });
    }

    FileHistory.prototype.attachNewContent = function(data) {

        addChangesetsToMap(data.values, this._visibleChangesets);

        $(this._listSelector).append($(stash.feature.fileContent.fileHistoryItems({
            historyPage : data,
            selectedCsid : (this._selectedRevisionRef && this._selectedRevisionRef.getId()) || '',
            lastPageMessage : stash_i18n('stash.web.filehistory.allhistoryfetched', 'No more history')
        })));
        $(this._scrollPaneSelector).children('.spinner').spinStop();
        if (data.isLastPage) {
            $(this._scrollPaneSelector).children('.spinner').remove();
        }
    };

    FileHistory.prototype.setButtonEnabled = function(enabled) {
        this._$historyButton.prop('disabled', !enabled).toggleClass('disabled', !enabled);
    };

    FileHistory.prototype.isButtonEnabled = function() {
        return !this._$historyButton.prop('disabled');
    };

    return FileHistory;
});
