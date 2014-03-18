define('widget/markup-preview', [
    'jquery',
    'underscore',
    'util/ajax',
    'util/dom-event',
    'util/events',
    'util/navbuilder',
    'widget/keyboard-shortcuts',
    'exports'
], function (
    $,
    _,
    ajax,
    domEventUtil,
    events,
    nav,
    keyboard,
    exports) {

    'use strict';

    function requestRender(text) {
        return ajax.rest({
            type: 'POST',
            url: nav.rest().markup().preview().build(),
            data: text,
            dataType: 'json'
        });
    }

    function showPreview($container, $text, $preview, $spinner) {
        $container.addClass('rendering');
        $spinner.spin('medium');

        // prevent duplicate requests
        var preview = $container.data('preview');
        if(!preview.request) {
            var text = $text.val();

            // disable editing
            $text.attr('disabled', 'disabled');

            // keep a reference to the preview's request, to prevent duplicate requests and allow cancellation
            preview.request = requestRender(text).done(function(markup) {
                $preview.html(markup.html);
                $container.addClass('previewing');

                // if the preview could be retrieved successfully, call the user's callback after updating the DOM
                if (preview.callback) {
                    preview.callback();
                }
            }).fail(function() {
                preview.request = null;
                hidePreview($container);
            }).done(function() {
                preview.request = null;
                $container.removeClass('rendering');
            }).always(function() {
                $spinner.spinStop();
            });
        }
    }

    function hidePreview($container) {
        $container.removeClass('rendering previewing');

        var preview = $container.data('preview');
        if (preview) {
            // cancel any preview in flight
            if (preview.request) {
                preview.request.abort();
            }

            // re-enable editing
            preview.text.removeAttr('disabled');

            // give the focus back to the text, so that the user can start typing immediately
            if ($container.is(':not(.collapsed)') && preview.text.is(':visible')) {
                preview.text.focus();
            }

            // call the user's callback if any was specified
            if (preview.callback) {
                preview.callback();
            }
        }
    }

    function isPreviewVisibleIn($container) {
        return $container.is('.rendering, .previewing');
    }

    function toggle($container, $text, $preview, $spinner) {
        return function(e) {
            e.preventDefault();

            if (isPreviewVisibleIn($container)) {
                hidePreview($container);
            } else {
                showPreview($container, $text, $preview, $spinner);
            }
        };
    }

    var defaults = {
        trigger: '.preview-button',
        text: 'textarea',
        preview: '.preview-markup',
        spinner: '.preview-spinner'
    };

    /**
     * Default selectors for the preview.
     */
    exports.defaults = defaults;

    /**
     * Binds the markup preview to a given form.
     * @param form form
     * @param options options for the preview
     *      - trigger,
     *      - text area,
     *      - preview area,
     *      - spinner,
     *      - callback when the preview is switched on and off
     */
    exports.bindTo = function(form, options) {
        var $form = $(form);
        options = $.extend({}, defaults, options);

        // replace selector by the jquery objects, if needed
        _.each(options, function (val, key) {
            if (val && _.isString(val)) {
                options[key] = $form.find(val);
            }
        });

        if (!$form.data('preview')) {
            var handler = toggle($form, options.text, options.preview, options.spinner);
            var data = { handler:handler, tooltip:{close:function () {}} };
            $form.data('preview', $.extend(data, options));

            options.preview.on('click', handler);
            options.trigger.on('click', handler);

            if (previewShortcutKeys) {
                data.tooltip = keyboard.addTooltip(options.trigger, previewShortcutKeys);
                $form.on('keydown.markup.preview', function (e) {
                    // There isn't a nice way in AUI to convert keys to this generically
                    // If you modify this, please update stash-plugins.xml as well
                    if (String.fromCharCode(e.which).toLowerCase() === 'p' && domEventUtil.isCtrlish(e) && e.shiftKey) {
                        handler(e);
                        if(isPreviewVisibleIn($form)) {
                            options.trigger.focus();
                        } else {
                            options.text.focus();
                        }
                    } else if (domEventUtil.isCtrlish(e) && e.which === $.ui.keyCode.ENTER) {
                        $form.submit();
                    }
                });
            }
        }
    };

    exports.hideIfVisible = function(form) {
        var $form = $(form);
        if (isPreviewVisibleIn($form)) {
            hidePreview($form);
        }
    };

    exports.unbind = function(form) {
        var $form = $(form);
        this.hideIfVisible($form);

        // unbind the trigger
        var data = $form.data('preview');
        if (data) {
            data.preview.off('click', data.handler);
            data.trigger.off('click', data.handler);
            $form.off('keydown.markup.preview');
            data.tooltip.remove();
            $form.removeData('preview');
        }
    };

    // Ensure that we always a default shortcut - ie for pull-request create
    // If you modify this, please update stash-plugins.xml as well
    var previewShortcutKeys = 'ctrl+shift+p';
    events.on('stash.keyboard.shortcuts.requestPreviewComment', function (keys) {
        previewShortcutKeys = keys;
    });

});
