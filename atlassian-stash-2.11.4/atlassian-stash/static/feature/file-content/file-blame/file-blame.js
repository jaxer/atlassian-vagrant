define('feature/file-content/file-blame', [
    'jquery',
    'underscore',
    'util/events',
    'util/ajax',
    'util/html',
    'util/navbuilder',
    'widget/submit-spinner',
    'widget/loaded-range',
    'model/page-state'
], function(
    $,
    _,
    events,
    ajax,
    htmlUtil,
    nav,
    SubmitSpinner,
    LoadedRange,
    pageState
) {

    function getBlame(restUrl, start, limit) {
        return ajax.rest({
            url : restUrl,
            data : {
                blame : true,
                noContent : true,
                start : start,
                limit: limit
            }
        });
    }
    
    function blameToHtml(blame) {
        return stash.feature.fileContent.fileBlameEntry({
            repository: pageState.getRepository().toJSON(),
            changeset: $.extend({
                id : blame.commitHash,
                displayId: blame.displayCommitHash
            }, blame)
        });
    }

    function blameArrayToHtml(blames) {
        return _.map(blames, blameToHtml).join('');
    }

    function FileBlame(blameButtonSelector, containerSelector, path, untilRevision) {

        var $blameButton = $(blameButtonSelector),
            blameSpinner = new SubmitSpinner($blameButton, 'before'),
            $blameColumn = $(stash.feature.fileContent.fileBlame()).prependTo($(containerSelector));

        this.$blameColumn = $blameColumn;
        this.$blameButton = $blameButton;
        this.blameSpinner = blameSpinner;
        this.loadedRange = new LoadedRange();
        this.pendingPages = [];
        this.path = path;
        this.untilRevision = untilRevision;

        this._enabled = !!$blameButton.attr('aria-pressed') && $blameButton.attr('aria-pressed') === 'true';
        $blameColumn.toggleClass('expanded', this.isEnabled());

        var self = this;
        $blameButton.click(function(event) {
            if (self.isButtonEnabled()) {
                self.setEnabled(!self.isEnabled());
            }

            event.preventDefault();
        });
    }

    FileBlame.prototype.reset = function() {

    };

    FileBlame.prototype.isEnabled = function() {
        return this._enabled;
    };

    FileBlame.prototype.setEnabled = function(enabled) {
        enabled = !!enabled;
        if (this._enabled !== enabled) {

            var self = this;
            this._enabled = enabled;

            this.$blameButton.attr('aria-pressed', self.isEnabled());
            self.$blameColumn.toggleClass('expanded', self.isEnabled());

            if (this.isEnabled()) {
                this.loadPendingPages();
            }

            events.trigger('stash.feature.fileblame.enabledStateChanged', this, this.isEnabled());
        }
    };

    FileBlame.prototype.setButtonEnabled = function(enabled) {
        this.$blameButton.attr('aria-disabled', !enabled);
    };

    FileBlame.prototype.isButtonEnabled = function() {
        return !this.$blameButton.attr('aria-disabled') || this.$blameButton.attr('aria-disabled') !== 'true';
    };

    FileBlame.prototype.loadPendingPages = function() {
        if (this.pendingPages.length) {
            this.setButtonEnabled(false);
            this.blameSpinner.show();

            var startPage = _.min(this.pendingPages, function(page) { return page.start; }),
                endPage = _.max(this.pendingPages, function(page) { return page.start + page.limit; });

            this.pendingPages = [];

            var self = this,
                start = startPage.start,
                size = endPage.start + endPage.limit - startPage.start;
            return this.requestData(start, size).done(function(data) {
                self.onDataLoaded(start, size, {
                    start : start,
                    size : size,
                    isLastPage : endPage.isLastPage,
                    blame : data
                });
            }).always(function() {
                self.setButtonEnabled(true);
                self.blameSpinner.hide();
            });
        }

        return $.Deferred().reject();
    };

    FileBlame.prototype.requestData = function(start, limit) {
        return getBlame(nav.currentRepo().browse()
            .path(this.path).at(this.untilRevision.getId()).build(), start, limit);
    };
    
    FileBlame.prototype.onDataLoaded = function(start, limit, data) {
        if (this.isEnabled()) {
            var attachmentMethod = this.loadedRange.getAttachmentMethod(start, data.size);

            htmlUtil.quickNDirtyAttach(this.$blameColumn[0], blameArrayToHtml(data.blame), attachmentMethod);

            this.loadedRange.add(start, data.size, data.isLastPage);
        } else {
            // load it when we're active
            this.pendingPages.push({
                start : start,
                limit : data.size,
                isLastPage : data.isLastPage || false
            });
        }
    };

    return FileBlame;
});
