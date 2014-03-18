define('widget/notifications-center', [
    'jquery',
    'exports'
], function(
    $,
    exports
) {

    'use strict';

    var $notificationsCenter;

    function getStatusNotificationsCenter() {
        if ($notificationsCenter) {
            return $notificationsCenter;
        }

        $notificationsCenter = $(stash.widget.notifications.center()).appendTo('body');
        return $notificationsCenter;
    }

    /**
     * Growl-like notifications that flash up on the bottom right
     * @param message
     */
    function showNotification(message) {
        var $notification = $(stash.widget.notifications.notification({ message: message }));
        getStatusNotificationsCenter().prepend($notification);
        if ($.browser.msie && parseInt($.browser.version, 10) <= 9) {
            // IE 9 and less can't do CSS animations
            $notification.fadeIn(function() {
                window.setTimeout(function() {
                    $notification.fadeOut(function() {
                        $notification.remove();
                    });
                }, 1500);
            });
        }
        $notification.on('animationend webkitAnimationEnd MSAnimationEnd oanimationend', function() {
            $notification.remove();
        });

        return $notification;
    }

    exports.showNotification = showNotification;
});
