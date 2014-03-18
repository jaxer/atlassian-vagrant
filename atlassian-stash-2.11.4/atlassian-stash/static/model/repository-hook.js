define('model/repository-hook', [
    'backbone-brace',
    'underscore',
    'util/ajax',
    'util/navbuilder'
], function(
    Brace,
    _,
    ajax,
    nav
    ) {

    'use strict';

    function showErrorWithReloadButton(xhr, textStatus, errorThrown, errors, dominantError) {
        return _.extend({}, dominantError, {
            fallbackTitle: stash_i18n("stash.web.repository.settings.hooks.notfound.fallback.title", "Reload"),
            fallbackUrl: nav.currentRepo().hooks().build(),
            canClose: false,
            shouldReload: false
        });
    }

    var RepositoryHookDetails = Brace.Model.extend({
        idAttribute: 'key',
        namedAttributes : {
            'key': 'string',
            'name' : 'string',
            'type' : 'string',
            'description' : 'string',
            'version' : 'string',
            'configFormKey' : 'string'
        }
    });

    var RepositoryHook = Brace.Model.extend({
        namedAttributes : {
            'details' : RepositoryHookDetails,
            'enabled': 'boolean',
            'configured': 'boolean'
        },
        initialize: function() {
            // Unfortunately there doesn't appear to be a way to use a nested idAttribute
            this.id = this.getDetails().getKey();
        },
        loadSettings: function() {
            return ajax.rest({
                url : nav.rest().currentRepo().hook(this).settings().build()
            });
        },
        saveSettings: function(config) {
            return ajax.rest({
                url : nav.rest().currentRepo().hook(this).settings().build(),
                type: 'PUT',
                data : config,
                statusCode : {
                    '400' : false
                }
            });
        },
        enable : function(config) {
            var opts = {
                url : nav.rest().currentRepo().hook(this).enabled().build(),
                type: 'PUT',
                statusCode : {
                    '404' : showErrorWithReloadButton,
                    '400' : false
                }
            };
            if (config) {
                opts.data = config;
            }
            var restPromise = ajax.rest(opts);
            restPromise.done(_.bind(this.setEnabled, this, true));
            return restPromise;
        },
        disable : function() {
            var restPromise = ajax.rest({
                url : nav.rest().currentRepo().hook(this).enabled().build(),
                type: 'DELETE',
                statusCode : {
                    '404' : showErrorWithReloadButton
                }
            });
            restPromise.done(_.bind(this.setEnabled, this, false));
            return restPromise;
        }
    });

    RepositoryHook.Collection = Brace.Collection.extend({
        model : RepositoryHook
    });

    return RepositoryHook;

});
