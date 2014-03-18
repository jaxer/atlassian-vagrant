define('widget/branch-selector', [
    'jquery',
    'underscore',
    'util/events',
    'aui',
    'util/ajax',
    'util/function',
    'util/navbuilder',
    'util/deprecation',
    'widget/paged-scrollable',
    'model/revision-reference',
    'widget/keyboard-controller'
], function (
    $,
    _,
    events,
    AJS,
    ajax,
    fn,
    nav,
    deprecate,
    PagedScrollable,
    RevisionReference,
    keyboardControllers
) {

    'use strict';

    var TabKeyboardController = keyboardControllers.TabKeyboardController,
        ListKeyboardController = keyboardControllers.ListKeyboardController;

    var BranchSelector = function (projectKey, repoSlug, options) {
        this._updateUrls(projectKey, repoSlug);
        this._pageSize = 10;

        this._options = options || {};

        //we start in branch mode
        this._mode = BranchSelector.type.BRANCH;
    };

    /**
     * @deprecated since 2.4. Removal in 3.0.
     * Use feature/repository/revision-reference-selector or feature/repository/branch-selector instead.
     * @type {Function}
     */
    BranchSelector.prototype = {
        init: function (context) {
            this._context = context || document;
            var self = this;
            this._wireComponents();
            // Ensure the correct tab is enabled (can happen after close)
            AJS.tabs.change($("#branch-selector-tab-" + this._mode.id));
            this.changeMode(this._mode);

            this.reset();

            var $input = this._textInput,
                inputVal = $input.val();
            this._textInput.on("keypress.branch-selector", function(e) {
                if (e.which > 0) {
                    self._resultsKeyboardController.blur();
                }
            });
            this._textInput.on("keyup.branch-selector", _.debounce(function () {
                if (inputVal !== (inputVal = $input.val())) {
                    self.populateBranchList();
                }
            }, 350));

            this._tagTab.add(this._branchTab)
                .append("<div class='spinner'/>")
                .on("click", "a", function(e) {
                    var $a = $(this),
                        $li = $a.parent();

                    var ref = new RevisionReference({
                        id: $li.attr('data-id'),
                        displayId : $.trim($a.text()),
                        latestChangeset : $li.attr('data-csid'),
                        type : self._mode.id,
                        isDefault : $li.attr('data-default') === 'true'
                    });

                    events.trigger("stash.widget.branchselector.revisionRefChanged", self, ref, self._options.context);

                    e.preventDefault();
                });

            this._tabMenu.on("tabSelect.branch-selector", "a", function (e, data) {
                self.changeMode(BranchSelector.type.from(data.tab.data("type")));
                self.populateBranchList();
            });
            this._tabMenu.on("click.branch-selector", ".active-tab a", function(e) {
                e.preventDefault();
            });
            this._tabMenu.on("keydown.branch-selector", ".menu-item a", function(e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    if ($(this).parent('li').hasClass('active-tab')) {
                        e.preventDefault();
                    } else {
                        $(this).click();
                    }
                }
            });
        },

        reset: function() {
            this._textInput.off(".branch-selector");
            this._tagTab.add(this._branchTab).off(".branch-selector");
            this._tabMenu.off(".branch-selector");
        },

        _requestBranchList: function (start, limit) {
            var searchData = this._getSearchData(this._getSearchTerm());
            searchData = $.extend(searchData, {"start": start, "limit": limit});
            var $spinner = this._refList.children('.spinner').show().spin();
            this._refList.scrollTop(this._refList[0].scrollHeight);
            var self = this;
            if (this.currentXHR) {
                this.currentXHR.abort();
            }

            var promise = this.currentXHR = ajax.rest({
                url : this._urls[this._mode.id],
                data : searchData,
                statusCode : ajax.ignore404WithinRepository()
            }).always(function () {
                $spinner.spinStop().hide();
                self.currentXHR = null;
            });

            return promise;
        },

        _getSearchData: function (searchTerm) {
            if (searchTerm) {
                return {"filterText": searchTerm};
            }
            return {};
        },

        _getBranchList: function () {
            return this._refScrollable.init();
        },

        _getBranchListElement: function () {
            return this._refList.find("ul.branch-list");
        },

        changeMode: function (type) {
            this._mode = type;
            this._refList = BranchSelector.type.isBranch(type) ? this._branchTab : this._tagTab;
            this._refScrollable = BranchSelector.type.isBranch(type) ? this._branchScrollable : this._tagScrollable;
            this._textInput.attr("placeholder", type.filterText);

            this._resultsKeyboardController.setListElement(this._refList);

            this.focusFilter();
        },

        _createScrollable: function (scrollElement) {
            var self = this,
                scrollable = new PagedScrollable(scrollElement, {
                    pageSize: this._pageSize,
                    bufferPixels: 0
                });

            scrollable.requestData = function (start, limit) {
                return self._requestBranchList(start, limit);
            };

            scrollable.attachNewContent = function (data) {
                if (!self._options.disableLinks) {
                    var uri = nav.parse(window.location.href);

                    _.each(data.values, function(branch) {
                        var branchUri = uri.clone();
                        if (branch.isDefault) {
                            branchUri.deleteQueryParam('at');
                        } else {
                            branchUri.replaceQueryParam('at', branch.displayId);
                        }
                        branch.url = branchUri.toString();
                    });
                }

                var $item = $(stash.widget.branchSelectorItems({
                        branchesPage : data,
                        branchSelectorType : self._mode.id,
                        isFirstPage : data.start === 0
                    })),
                    scrollContent = self._getBranchListElement();
                scrollContent.append($item);

                if (data.start === 0) {
                    self._resultsKeyboardController.moveToNext();
                }
            };
            return scrollable;
        },

        _getSearchTerm: function () {
            return this._textInput.val();
        },

        _wireComponents: function () {
            var self = this;

            AJS.tabs.setup();
            this._tabMenu = $(".tabs-menu", this._context);
            this._textInput = $("input", this._context);
            this._branchTab = $("#branch-pane", this._context);
            this._tagTab = $("#tag-pane", this._context);
            this._branchScrollable = this._createScrollable(this._branchTab);
            this._tagScrollable = this._createScrollable(this._tagTab);

            if (this._resultsKeyboardController) {
                this._resultsKeyboardController.destroy();
            }

            this._resultsKeyboardController = new ListKeyboardController(this._textInput, this._refList, {
                wrapAround: false,
                focusedClass : 'focused',
                itemSelector : 'li.result',
                requestMore : function() {
                    var loadAfterPromise = self._refScrollable.loadAfter();
                    return loadAfterPromise && loadAfterPromise.then(fn.dot('isLastPage'));
                },
                onSelect : function($focused) {
                    $focused.children('a').click();
                },
                focusIntoView : true
            });

            if (this._tabKeyboardController) {
                this._tabKeyboardController.destroy();
            }
            // Making tab focus styles override well in IE is super hard (no outline-offset support)
            // Safari and FF styles suck, so override them with our primary color
            var overrideFocusStyles = $.browser.mozilla || $.browser.webkit;
            if (overrideFocusStyles) {
                this._context.addClass('override-focus-style');
            }
            this._tabKeyboardController = new TabKeyboardController(this._context);
        },

        clearBranchList: function () {
            this._getBranchListElement().empty();
        },

        populateBranchList: function () {
            this.clearBranchList();
            this._getBranchList();
        },

        focusFilter: function () {
            this._textInput.focus();
        },

        setProjectAndRepo: function (projectKey, repoSlug) {
            this._updateUrls(projectKey, repoSlug);
            events.trigger("stash.widget.branchselector.repoChanged", this, projectKey, repoSlug, this._options.context);
        },

        _updateUrls: function (projectKey, repoSlug) {
            this._urls = {
                "tag": nav.rest().project(projectKey).repo(repoSlug).tags().build(),
                "branch": nav.rest().project(projectKey).repo(repoSlug).branches().build()
            };
        }
    };

    var Type = BranchSelector.type = {
        TAG: {
            id: "tag",
            name: stash_i18n('stash.web.revisionref.tags.name', 'Tag'),
            filterText: stash_i18n('stash.web.filebrowser.branchselector.tags.placeholder', 'Search tags')
        },
        BRANCH: {
            id: "branch",
            name: stash_i18n('stash.web.revisionref.branches.name', 'Branch'),
            filterText: stash_i18n('stash.web.filebrowser.branchselector.branches.placeholder', 'Search branches')
        },
        isTag: function (o) {
            return o === Type.TAG || o === Type.TAG.id;
        },
        isBranch: function (o) {
            return o === Type.BRANCH || o === Type.BRANCH.id;
        },
        from: function (o) {
            if (Type.isTag(o)) {
                return Type.TAG;
            } else if (Type.isBranch(o)) {
                return Type.BRANCH;
            }
            AJS.log("Unknown BranchSelector type " + o);
            return null;
        }
    };

    return deprecate.construct(BranchSelector, "widget/branch-selector", "feature/repository/revision-reference-selector or feature/repository/branch-selector", "2.4", "3.0");
});
