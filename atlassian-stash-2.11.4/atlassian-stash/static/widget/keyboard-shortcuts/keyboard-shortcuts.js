define('widget/keyboard-shortcuts', [
    'aui',
    'jquery',
    'underscore',
    'util/events',
    'exports'
], function(
    AJS,
    $,
    _,
    events,
    exports) {

    'use strict';

    var isMac = navigator.platform.indexOf('Mac') !== -1,
        CTRL = /^[cC]trl$/i,
        CMD = '\u2318'; // Mac `command` key symbol

    var _shortcutsByDisplayContext = {};

    function KeyboardShortcuts(trigger) {
        if (!(this instanceof KeyboardShortcuts)) {
            return new KeyboardShortcuts(trigger, registry);
        }

        this._$trigger = trigger;

        this._dialog = new AJS.Dialog({
            width:830,
            height:580,
            id:"keyboard-shortcut-dialog",
            closeOnOutsideClick: true
        });

        this._bind();

        this._enabledContexts = [];
    }

    KeyboardShortcuts.prototype._setRegistry = function(registry) {
        this._registry = registry;
    };

    KeyboardShortcuts.prototype._initContent = function() {
        this._dialog.addHeader(stash_i18n("stash.web.keyboardshortcuts.header", "Keyboard Shortcuts"));
        this._dialog.addPanel('', stash.widget.keyboardShortcutsContent({
            contextNames:_.keys(_shortcutsByDisplayContext),
            contexts:_.values(_shortcutsByDisplayContext)
        }));
        this._dialog.addCancel(stash_i18n('stash.web.button.close', 'Close'), function (dialog) {
            dialog.hide();
        });
    };

    KeyboardShortcuts.prototype._bind = function() {
        var self = this;
        this._$trigger.on('click', function(e) {
              self._show();
              e.preventDefault();
        });
    };


    KeyboardShortcuts.prototype.enableContext = function(context) {
        if ($.inArray(context, this._enabledContexts) !== -1) {
            return;
        }
        this._registry.enableContext(context);
        this._enabledContexts.push(context);
    };

    KeyboardShortcuts.prototype.resetContexts = function() {
        AJS.trigger("remove-bindings.keyboardshortcuts");
        this._enabledContexts = [];
        AJS.trigger("add-bindings.keyboardshortcuts");
    };

    KeyboardShortcuts.prototype._show = function() {
        //If this is the first time shown, init the content
        if (!this._hasShown) {
            this._initContent();
            this._hasShown = true;
        }
        this._dialog.show();
        this._dialog.updateHeight();
        this._dialog.getCurrentPanel().body.find('.keyboard-shortcut-help').focus();
    };

    KeyboardShortcuts.prototype.addCustomShortcut = function(context, keys, description, displayContext) {
        var shortcut = internalizeShortcut({
            keys : keys,
            context : context,
            displayContext : displayContext,
            description : description
        }, { convertOSModifier : false });
    };

    KeyboardShortcuts.convertOSModifier = function(key) {
        return (isMac) ? key.replace(CTRL, CMD) : key;
    };

    function internalizeShortcut(shortcut, options) {
        //need to do a copy to avoid messing up the shortcuts for whenIType
        shortcut = $.extend({}, shortcut);
        shortcut.keys = _.map(shortcut.keys, function(option) {
            return _.map(option, function(keypress) {
                if (_.all(['key', 'modifiers'], _.partial(_.has, keypress))) {
                    return keypress;
                }

                //Don't split on '+' when keypress length is 1, in case keypress is '+' only.
                var presses = (keypress.length > 1) ? keypress.split("+") : keypress;
                if (!_.isArray(presses) || presses.length === 1) {
                    return keypress;
                }
                return {
                    'key': presses.pop(),
                    // default is to convert the modifier
                    'modifiers': options && options.convertOSModifier === false ?
                                 presses :
                                 _.map(presses, KeyboardShortcuts.convertOSModifier)
                };
            });
        });

        if (!shortcut.displayContext) {
            shortcut.displayContext = KeyboardShortcuts._contextDisplayInfo[shortcut.context] ?
                KeyboardShortcuts._contextDisplayInfo[shortcut.context].displayName :
                shortcut.context.replace(/\b[a-z]/g, function(str) {
                    return str.toUpperCase();
                });
        }

        if (!_shortcutsByDisplayContext[shortcut.displayContext]) {
            _shortcutsByDisplayContext[shortcut.displayContext] = [];
        }
        _shortcutsByDisplayContext[shortcut.displayContext].push(shortcut);
    }

    KeyboardShortcuts.internalizeShortcuts = function(shortcuts) {
        _.each(shortcuts, internalizeShortcut);
    };

    KeyboardShortcuts._contextDisplayInfo = {
        'branch' : { displayName : stash_i18n('keyboard.shortcuts.context.repository', 'Within A Repository') },
        'branch-list' : { displayName : stash_i18n('keyboard.shortcuts.context.branch-list', 'Branch list') },
        'changeset' : { displayName : stash_i18n('keyboard.shortcuts.context.changeset', 'Changeset') },
        'commits' : { displayName : stash_i18n('keyboard.shortcuts.context.commits', 'Commit List') },
        'diff-tree' : { displayName : stash_i18n('keyboard.shortcuts.context.diff-tree', 'Changeset') }, //Map this to changeset too
        'diff-view' : { displayName : stash_i18n('keyboard.shortcuts.context.diff-view', 'Diff View') },
        'filebrowser' : { displayName : stash_i18n('keyboard.shortcuts.context.filebrowser', 'Directory Browsing') },
        'global' : { displayName : stash_i18n('keyboard.shortcuts.context.global', 'Global') },
        'pull-request' : { displayName : stash_i18n('keyboard.shortcuts.context.pull-request', 'Within A Pull Request') },
        'pull-request-list' : { displayName : stash_i18n('keyboard.shortcuts.context.pull-request-list', 'Pull Request List') },
        'pull-request-overview' : { displayName : stash_i18n('keyboard.shortcuts.context.pull-request', 'Within A Pull Request') },
        'sourceview' : { displayName : stash_i18n('keyboard.shortcuts.context.sourceview', 'Source View') }
    };

    var keyboardShortcuts;
    exports.onReady = function() {
        // hardcoded keyboard link selector for now
        keyboardShortcuts = new KeyboardShortcuts($('.keyboard-shortcut-link'));

        var onAfterDocumentReady = $.Deferred();
        $(document).ready(function() { // ensure everyone has had a chance to bind listeners before initializing
            setTimeout(function() {
                onAfterDocumentReady.resolve();
            }, 0);
        });

        AJS.bind("register-contexts.keyboardshortcuts", function(e, data) {

            keyboardShortcuts._setRegistry(data.shortcutRegistry);
            keyboardShortcuts.enableContext("global");

            onAfterDocumentReady.done(function() {
                events.trigger('stash.widget.keyboard-shortcuts.register-contexts', keyboardShortcuts, keyboardShortcuts);
            });
        });

        AJS.bind("shortcuts-loaded.keyboardshortcuts", function(e, data) {
            KeyboardShortcuts.internalizeShortcuts(data.shortcuts);
        });

        // TODO: load real keyboard shortcuts version.  Updating keyboard shortcuts will cause caching hell currently.
        AJS.params["keyboardshortcut-hash"] = 'bundled';

        AJS.trigger("initialize.keyboardshortcuts");
    };

    /**
     * Converts 'ctrl+shift+p' to ' Type (Ctrl + Shift + p)' (or the version for Mac)
     * and appends it to $el's title attribute.
     */
    exports.addTooltip = function($el, keys) {
        var keysTitle = _(keys.split('+')).chain().map(KeyboardShortcuts.convertOSModifier).map(function(key) {
            if (key === 'shift') {
                return stash_i18n('stash.keyboard-shortcuts.key.shift', 'Shift');
            } else if (key === 'ctrl') {
                return KeyboardShortcuts.convertOSModifier(stash_i18n('stash.keyboard-shortcuts.key.ctrl',  'Ctrl'));
            } else {
                return key;
            }
        }).value().join(' + ');
        var oldTitle = $el.attr('title');
        $el.attr('title', oldTitle + stash_i18n('stash.keyboard-shortcuts.type', " (Type ''{0}'')", keysTitle));
        return {
            remove: function() {
                $el.attr('title', oldTitle);
            }
        };
    };

    exports.showDialog = function() {
        if (keyboardShortcuts) {
            keyboardShortcuts._show();
        }
    };

});
