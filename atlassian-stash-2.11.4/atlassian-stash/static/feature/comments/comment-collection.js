define('feature/comments/comment-collection', [
    'backbone',
    'feature/comments/comment-model',
    'util/navbuilder'
], function (
    Backbone,
    Comment
) {

    "use strict";

    return Backbone.Collection.extend({
        initialize : function(models, options) {
            options = options || {};
            this.anchor = options.anchor;
        },
        model : Comment,
        url : function() {
            return this.anchor.urlBuilder().build();
        }
    });
});
