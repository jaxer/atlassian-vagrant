define('feature/permission/multi-selector', [
    'backbone-brace',
    'jquery',
    'underscore',
    'feature/user/group-multi-selector',
    'feature/user/user-multi-selector'
], function(
    Brace,
    $,
    _,
    GroupMultiSelector,
    UserMultiSelector) {

    var entityTypeToSelectorConstructor = {
        user: UserMultiSelector,
        group: GroupMultiSelector
    };

    function createGetSelected(delegate, entityType) {
        return function() {
            return _.pluck(delegate(), entityType);
        };
    }

    var PermissionMultiSelector = Brace.View.extend({

        events: {
            'click .add-button': '_onClickAdd'
        },

        /**
         * @param {Object} opts the options available to the PermissionMultiSelector. Valid options are:
         *
         * * {String}   entityType (required) either 'user' or 'group'
         * * {String}   url        (required) the REST resource to search
         * * {Function} add        (required) the callback to be invoked when the add button is clicked
         *
         */
        initialize: function(opts) {
            var $field = this.$el.find('.permission-multi-selector');
            this._$addButton = this.$el.find('.add-button');

            var DelegateMultiSelector = entityTypeToSelectorConstructor[opts.entityType];
            if (!DelegateMultiSelector) {
                throw "Unknown entity type: " + opts.entityType;
            }
            this._delegate = new DelegateMultiSelector($field, { dataSource : opts.dataSource });

            if (!(_.isFunction(opts.add))) {
                throw "must provide an add function";
            }

            // This must be bound on the dropdown as it is moved around the DOM
            var $dropdown = this.$el.find('.permission-type-dropdown');
            $dropdown.on('click', 'a', _.bind(this._onSelectPermission, this));

            this._permission = $dropdown.find('li:first-child').attr('data-value');

            this._delegate.on('change', _.bind(this._onChangeEntitySelection, this));
            this._onChangeEntitySelection();

            this.$el.on('keydown', _.bind(function(e) {
                // If a keydown event bubbles up to the container from the multi-select
                // then We should add the selected. This allows for easier use of the selector
                // via the keyboard
                if (e.which === $.ui.keyCode.ENTER && e.target.tagName === 'INPUT' && this.getSelected().length) {
                    e.preventDefault();
                    this._addSelected();
                }
            }, this));
        },
        getSelected: function() {
            return this._delegate.getSelectedItems();
        },
        getPermission: function() {
            return this._permission;
        },
        showError: function(data) {
            this.clearError();
            var $errors = this._$errors = $('<div></div>');
            var errors = data && data.errors && data.errors.length ? data.errors : [{
                message : stash_i18n('stash.web.permission.multiselector.unexpected.error', 'An unexpected error occurred. Consult your system logs for more information.')
            }];
            _.forEach(errors, function(error) {
                $('<p class="error-message"></p>').text(error.message).appendTo($errors);
            });
            $errors.appendTo(this.$el.children('th'));
        },
        clearError: function() {
            if (this._$errors) {
                this._$errors.remove();
                this._$errors = null;
            }
        },
        clear: function() {
            this.clearError();
            this._delegate.clearSelectedItems();
            this._setAddButtonDisabled(true);
        },
        _addSelected: function() {
            this._setAddButtonDisabled(true);
            $.when(this.options.add({
                    entities: this.getSelected(),
                    permission: this.getPermission()
                }))
                .always(_.bind(this._setAddButtonDisabled, this, false))
                .done(_.bind(this.clear, this))
                .fail(_.bind(function(xhr, statusText, errorType, data) {
                    this.showError(data);
                }, this));
        },
        _setAddButtonDisabled: function(disabled) {
            this._$addButton
                .toggleClass('disabled', disabled)
                .prop('disabled', disabled);
        },
        _onClickAdd: function(e) {
            e.preventDefault();
            this._addSelected();
        },
        _onSelectPermission: function(e) {
            e.preventDefault();
            var $anchor = $(e.target);
            this._permission = $anchor.closest('li').attr('data-value');
            this.$el.find('.permission-type-trigger').text($anchor.text());
        },
        _onChangeEntitySelection: function() {
            this._setAddButtonDisabled(!(this.getSelected().length));
        }
    });

    return PermissionMultiSelector;
});