define('feature/comments/comment-model', [
    'backbone',
    'backbone-brace',
    'underscore',
    'util/navbuilder'
], function (
    Backbone,
    Brace,
    _,
    navbuilder
) {

    "use strict";

    var Comment = Brace.Model.extend({
        namedAttributes : {
            anchor : null,
            author : null,
            avatarSize : null,
            comments : null,
            createdDate : 'number',
            html : 'string',
            id : 'number',
            isFocused : 'boolean',
            isUnread : 'boolean',
            parent : null,
            permittedOperations : null,
            text : 'string',
            updatedDate : 'number',
            version : 'number'
        },
        validate : function(attributes) {
            if (!attributes.text || !/\S/.test(attributes.text)) {
                return stash_i18n('stash.web.comment.empty', "Please enter some text");
            }
        },
        url : function() {
            var uri = navbuilder.parse(Brace.Model.prototype.url.apply(this, arguments));

            // Backbone appends comment id after query params in the url created from the collection's navbuilder
            // So we can't add query params via navbuilder. They must be added after
            var anchor = this.get('anchor');
            if (anchor && anchor.commitRange) {
                // Check since initial commit won't have a since revision
                var sinceRevision = anchor.commitRange.sinceRevision;
                if (sinceRevision) {
                    uri.addQueryParam('since', sinceRevision.id);
                }
            }

            uri.addQueryParam('version', this.get('version'))
                .addQueryParam('avatarSize', this.get('avatarSize'))
                .addQueryParam('markup', true);
            return uri.toString();
        },
        forEachCommentInThread : function(fn) {
            fn(this);
            _.each(this.get('comments'), function(comment) {
                comment.forEachCommentInThread(fn);
            });
        },
        sync: function(method, model, options) {
            return Backbone.sync(method, model, _.extend(options, {
                statusCode : {
                    '404' : function(xhr, testStatus, errorThrown, data, fallbackError) {

                        var error = data && data.errors && data.errors.length && data.errors[0];

                        // TODO - our error handling needs some error codes to avoid this kind of heuristic stuff.
                        if (error && error.message && /comment/i.test(error.message)) {
                            //If replying, show a custom error and allow the user to reload the page
                            if (method === 'create' && model.get('parent') != null) {
                                return {
                                    title: stash_i18n('stash.web.comment.notfound', 'Comment not found'),
                                    message: stash_i18n('stash.web.comment.reply.parent.notfound.message', 'The comment you are replying to no longer exists.'),
                                    shouldReload: true,
                                    fallbackUrl: undefined
                                };
                            } else if (method === 'update') {
                                return {
                                    title: stash_i18n('stash.web.comment.notfound', 'Comment not found'),
                                    message: stash_i18n('stash.web.comment.update.notfound.message', 'The comment you are updating no longer exists.'),
                                    shouldReload: true,
                                    fallbackUrl: undefined
                                };
                            }

                        }
                    }
                }
            }));
        }
    });

    // We have to add the type checking after Comment is already created so we can type-check against the Comment class.
    Brace.Mixins.applyMixin(Comment, {
        namedAttributes : {
            comments : [ Comment ]
        }
    });

    return Comment;
});
