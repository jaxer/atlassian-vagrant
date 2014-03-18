define('widget/approve', [
    'jquery',
    'util/ajax',
    'util/events',
    'model/page-state',
    'widget/button-trigger'
], function(
    $,
    ajax,
    events,
    pageState,
    ButtonTrigger
) {

    'use strict';

    function Approve(selectorTrigger, url) {
        this._opts = {
            url: url,
            triggerHandler: this.buttonClicked
        };

        ButtonTrigger.call(this, selectorTrigger, this._opts);

        var self = this;

        var handler = function (data) {
            if (pageState.getCurrentUser() && data.user.getName() === pageState.getCurrentUser().getName() &&
                data.pullRequestId === pageState.getPullRequest().getId()) {

                self.setTriggerActive(data.approved);

                var newTitle = data.approved ?
                    stash_i18n("stash.web.pull-request.toolbar.approved.tooltip", "You have approved this pull request") :
                    stash_i18n("stash.web.pull-request.toolbar.approved.tooltip", "Approve this pull request");
                self._$trigger.attr('title', newTitle + self._$trigger.data('kbShortcutAppended'));

            }
        };

        // optimistic event listening (assume it works, then revert if necessary)
        events.on('stash.widget.approve-button.adding', handler);
        events.on('stash.widget.approve-button.removing', handler);
        events.on('stash.widget.approve-button.add.failed', handler);
        events.on('stash.widget.approve-button.remove.failed', handler);
    }
    $.extend(Approve.prototype, ButtonTrigger.prototype);

    Approve.prototype.buttonClicked = function (isOn, event) {
        var self = this;

        function fireEvent(eventName, approved) {
            events.trigger(eventName, self, {
                approved : approved,
                pullRequestId: pageState.getPullRequest().getId(),
                user: pageState.getCurrentUser()
            });
        }

        fireEvent(isOn ? 'stash.widget.approve-button.adding' : 'stash.widget.approve-button.removing', isOn);

        ajax.rest({
            url: self._opts.url,
            type: isOn ? 'POST' : 'DELETE',
            statusCode: {
                '401' : function(xhr, textStatus, errorThrown, errors, dominantError) {
                    return $.extend({}, dominantError, {
                        title: stash_i18n("stash.web.pull-request.approve.error.401.title", "Could not approve pull request."),
                        message: stash_i18n("stash.web.pull-request.approve.error.401.message", "You do not have permission to approve this pull request."),
                        fallbackUrl: false,
                        shouldReload: true
                    });
                },
                '409' : function(xhr, textStatus, errorThrown, errors, dominantError) {
                    return $.extend({}, dominantError, {
                        title: stash_i18n("stash.web.pull-request.approve.error.409.title", "Could not approve pull request."),
                        fallbackUrl: false,
                        shouldReload: true
                    });
                }
            }
        }).done(function() {
            fireEvent(isOn ? 'stash.widget.approve-button.added' : 'stash.widget.approve-button.removed', isOn);
        }).fail(function () {
            fireEvent(isOn ? 'stash.widget.approve-button.add.failed' : 'stash.widget.approve-button.remove.failed', !isOn);
        });
    };

    return Approve;
});
