define('backbone', [
    'backbone-raw',
    'util/ajax'
], function (
    Backbone,
    ajaxUtil
) {

    var CRUDmap = {
        create : 'POST',
        read : 'GET',
        update : 'PUT',
        'delete' : 'DELETE'
    };

    Backbone.sync = function(method, model, opts) {
        var options = _.extend({
            url :_.isFunction(model.url) ? model.url() : model.url,
            type : CRUDmap[method],
            data : model.toJSON()
        }, opts);

        return ajaxUtil.rest(options);
    };

    return Backbone;
});
