define('feature/repository/hook-list', [
    'aui',
    'jquery',
    'underscore',
    'backbone-brace',
    'util/config-form',
    'util/ajax',
    'widget/submit-spinner',
    'util/navbuilder'
],
function(
    AJS,
    $,
    _,
    Brace,
    ConfigForm,
    ajax,
    SubmitSpinner,
    navBuilder) {

    function Dialog(hook) {
        var dialog = this._dialog = new AJS.Dialog({
            width: 840,
            height: 480,
            id: 'repository-hook-dialog',
            closeOnOutsideClick: false,
            keypressListener: _.bind(function (e) {
                if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    e.stopImmediatePropagation(); // AUI-1054: AUIDialog.updateHeight() rebinds the keypressListener at every call;
                                                  // thus we need to have jQuery stops the immediate propagation of the event to prevent successive invocations.
                    this.close();
                }
            }, this)
        });
        dialog.addHeader(' ')
            .addPanel('', '<div class="hook-config-contents"/>')
            .addSubmit(stash_i18n('stash.web.button.enable', 'Enable'), _.bind(this.saveHook, this))
            .addButton(stash_i18n('stash.web.button.disable', 'Disable'), _.bind(this.disableHook, this), 'button-panel-disable-button')
            .addCancel(stash_i18n('stash.web.button.cancel', 'Cancel'), _.bind(this.close, this));

        this._hook = hook;
        $('#repository-hook-dialog').on('submit', 'form', _.bind(function(e) {
            e.preventDefault();
            this.saveHook();
        }, this));
    }

    Dialog.prototype._resize = function() {
        _.delay(_.bind(this._dialog.updateHeight, this._dialog));
    };

    Dialog.prototype._getConfigContents = function() {
        return this.$('.hook-config-contents');
    };

    Dialog.prototype.saveHook = function() {
        var $spinner = new SubmitSpinner(this.$('.button-panel-submit-button', this._dialog.getPage(0).buttonpanel), 'before').show();
        this._dialog.disable();
        this._configForm.save(
                this._hook.getEnabled() ?
                    _.bind(this._hook.saveSettings, this._hook) :
                    _.bind(this._hook.enable, this._hook)
            )
            .done(_.bind(this.close, this))
            .fail(_.bind(this._resize, this))
            .fail(_.bind(this._dialog.enable, this._dialog))
            .always(_.bind($spinner.remove, $spinner));
    };

    Dialog.prototype.disableHook = function() {
        var promise = this._hook.disable();
        promise.always(_.bind(this.close, this));
    };

    Dialog.prototype.$ = function(selector) {
        return $('#repository-hook-dialog').find(selector);
    };

    Dialog.prototype.close = function() {
        this._dialog.remove();
        this._hook = null;
        this._configForm = null;
    };

    Dialog.prototype.show = function() {
        var hook = this._hook;
        if (!hook.getDetails().getConfigFormKey()) {
            throw new Error("Dialog without configuration cannot be shown");
        }

        this.$('.dialog-title').text(hook.getDetails().getName());

        var $configContents = this._getConfigContents().empty();
        $configContents.spin('large');

        var configForm = this._configForm = new ConfigForm($configContents, hook.getDetails().getConfigFormKey());

        configForm.loadAndRender(_.bind(hook.loadSettings, hook))
            .done(_.bind(this._resize, this));

        this.$('.button-panel-disable-button')[hook.getEnabled() ? 'show' : 'hide']();
        this.$('.button-panel-submit-button').text(hook.getEnabled() ?
            stash_i18n('stash.web.button.save', 'Save') :
            stash_i18n('stash.web.button.enable', 'Enable')
        );

        this._dialog.show();
        return this;
    };

    //noinspection UnnecessaryLocalVariableJS
    var HookListView = Brace.View.extend({
        initialize: function() {
            this.collection.on("change:enabled", _.bind(this.changeEnabledState, this));
            this.currentHookPageStart = this.$('tbody > tr').length;
            this.$loadMoreLink = this.$('.load-more');
            _.bindAll(this,'onHooksLoaded');
        },
        events: {
            'click .load-more' : 'loadMore',
            'click .hook-name a' : 'configureHook',
            'click .edit-button' : 'configureHook',
            'click .mode-enabled' : 'enableHook',
            'click .mode-disabled' : 'disableHook'
        },
        loadMore : function(e) {
            e.preventDefault();
            this.$loadMoreLink.next('.spinner').show().spin();

            ajax.rest({
                url : navBuilder.rest().currentRepo().hooks().build(),
                type : 'GET',
                data : {type:this.options.hookType, start: this.currentHookPageStart, limit: 25}
            }).done(this.onHooksLoaded);
        },
        onHooksLoaded : function (data) {
            this.$el.children('tbody').append(stash.feature.repository.hookRows({ values:data.values }));
            this.currentHookPageStart += data.size;
            if (data.isLastPage) {
                this.$loadMoreLink.closest('.load-more-row').hide();
            }
            this.$loadMoreLink.next('.spinner').spinStop().hide();
        },
        configureHook : function(e) {
            e.preventDefault();
            var hookKey = $(e.target).closest('tr').attr('data-key');
            var hook = this.collection.get(hookKey);
            if (hook) {
                this.createDialog(hook);
            }
        },
        enableHook : function(e) {
            e.preventDefault();
            var $link = $(e.target);
            var hookKey = $link.closest('tr').attr('data-key');
            var hook = this.collection.get(hookKey);
            if (!hook.getConfigured() && hook.getDetails().getConfigFormKey()) {
                this.createDialog(hook);
            } else {
                this.changeEnabledStateNow(hook, hook.enable(), true);
            }
        },
        disableHook : function(e) {
            e.preventDefault();
            var $link = $(e.target);
            var hookKey = $link.closest('tr').attr('data-key');
            var hook = this.collection.get(hookKey);
            this.changeEnabledStateNow(hook, hook.disable(), false);
        },
        createDialog: function(hook) {
            var dialog = new Dialog(hook);
            dialog.show();
        },
        changeEnabledStateNow: function(changedHook, promise, enabled) {
            this.changeEnabledStateWithStatus(changedHook, enabled);
            promise.fail(_.bind(this.changeEnabledState, this, changedHook));
        },
        changeEnabledState: function(changedHook) {
            this.changeEnabledStateWithStatus(changedHook, changedHook.getEnabled());
        },
        changeEnabledStateWithStatus: function(changedHook, enabled) {
            var $actionsCell  = this.$('tr[data-key="' + changedHook.getDetails().getKey() + '"] .cell-actions');
            $actionsCell.html(stash.feature.repository.hookActions({enabled: enabled}));
        }
    });

    return HookListView;
});
