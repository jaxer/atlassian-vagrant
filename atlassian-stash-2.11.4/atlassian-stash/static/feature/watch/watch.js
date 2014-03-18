define('feature/watch', [
    'jquery',
    'underscore',
    'util/ajax',
    'util/deprecation',
    'model/page-state'
], function(
    $,
    _,
    ajax,
    deprecation,
    pageState
) {

    'use strict';

    var types = {
        COMMIT : 'commit',
        PULL_REQUEST : 'pull-request'
    };

    function Watch($watchButton, url, watchableType) {
        var self = this;
        this.url = url;
        this.$watch = $watchButton;
        this.isWatching = pageState.getIsWatching();
        this.watchableType = watchableType;

        this.$watch.on('click', triggerClicked);

        _.bindAll(this, 'toggleWatch', 'toggleUnwatch', 'toggleTrigger');

        function fireDeprecatedEvent(deprecatedEventName, sinceVersion, removeVersion) {
            var userData = {
                user: pageState.getCurrentUser()
            };
            deprecation.triggerDeprecated(deprecatedEventName, self, userData, undefined, sinceVersion, removeVersion);
        }

        function triggerClicked(e) {
            e.preventDefault();

            if (self.isWatching) {
                fireDeprecatedEvent('stash.widget.watch-button.removing', '2.11', '3.0');
            } else {
                fireDeprecatedEvent('stash.widget.watch-button.adding', '2.11', '3.0');
            }
            var newState = !self.isWatching; // newState is optimistic
            self.toggleTrigger(newState);

            return ajax.rest({
                url: self.url,
                type: self.isWatching ? 'DELETE' : 'POST',
                statusCode: {
                    '401' : function(xhr, textStatus, errorThrown, errors, dominantError) {
                        return $.extend({}, dominantError, {
                            title: stash_i18n("stash.web.watch.default.error.401.title", "Could not watch this."),
                            message: stash_i18n("stash.web.watch.default.error.401.message", "You do not have permission to watch this."),
                            fallbackUrl: false,
                            shouldReload: true
                        });
                    },
                    '409' : function(xhr, textStatus, errorThrown, errors, dominantError) {
                        return $.extend({}, dominantError, {
                            title: stash_i18n("stash.web.watch.default.error.409.title", "Could not watch this."),
                            fallbackUrl: false,
                            shouldReload: true
                        });
                    }
                }
            }).done(function() {
                self.isWatching = newState;
                pageState.setIsWatching(newState);

                if (self.isWatching) {
                    fireDeprecatedEvent('stash.widget.watch-button.added', '2.11', '3.0');
                } else {
                    fireDeprecatedEvent('stash.widget.watch-button.removed', '2.11', '3.0');
                }
            }).fail(function() {
                self.toggleTrigger(self.isWatching); // Revert trigger to actual state

                if (self.isWatching) {
                    fireDeprecatedEvent('stash.widget.watch-button.remove.fail', '2.11', '3.0');
                } else {
                    fireDeprecatedEvent('stash.widget.watch-button.add.fail', '2.11', '3.0');
                }
            });
        }
    }

    /**
     * Sets the isWatching state and sets the trigger label text
     * @param isWatching
     */
    Watch.prototype.setIsWatching = function(isWatching) {
        this.toggleTrigger(isWatching);
        this.isWatching = isWatching;
        if (pageState.getIsWatching() !== isWatching) {
            pageState.setIsWatching(isWatching);
        }
    };

    Watch.prototype.toggleWatch = function() {
        this.toggleTrigger(true);
    };

    Watch.prototype.toggleUnwatch = function() {
        this.toggleTrigger(false);
    };

    /**
     * Toggles the label text for the watching trigger. Does not change isWatching state.
     * @param isWatching - If true, label will be "Unwatch ..". If false, label will be "Watch .."
     */
    Watch.prototype.toggleTrigger = function(isWatching) {
        var triggerHtml;

        switch (this.watchableType) {
            case Watch.type.COMMIT:
                triggerHtml = stash.feature.watch.commitLabel({ isWatching: isWatching });
                break;
            case Watch.type.PULL_REQUEST:
                triggerHtml = stash.feature.watch.pullRequestLabel({ isWatching: isWatching });
                break;
        }

        this.$watch.fadeOut(200, function() {
            $(this).html(triggerHtml).fadeIn(200);
        });
    };

    Watch.prototype.destroy = function() {
        this.url = null;
        this.$watch = null;
        this.isWatching = null;
    };

    Watch.type = types;

    return Watch;
});
