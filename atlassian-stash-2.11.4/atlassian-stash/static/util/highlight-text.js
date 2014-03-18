define('util/highlight-text', [
    'aui',
    'underscore',
    'util/regexp'
], function(
    AJS,
    _,
    regexp
) {

    'use strict';

    var escapeHtmlRegexp = function(str) {
        return regexp.escape(AJS.escapeHtml(str));
    };

    return {
        /**
         * Wraps matching text in <strong> tags
         *
         * @param {string}          sourceText          The text within which to look for matches to highlight
         * @param {string|Array}    highlightText       Single or multiple strings to highlight within the sourceText
         * @param {string}          modifiers           Regex modifiers to control what will be matched. The default
         *                                              value is 'gi', which translates into global case-insensitive
         *                                              matching. This argument value must contain valid Regex modifiers,
         *                                              see documentation of the RegExp object for valid values.
         * @return {string} HTML string with the textual parts html-escaped
         */
        highlight: function(sourceText, highlightText, modifiers) {
            if (!highlightText || highlightText.length === 0) return AJS.escapeHtml(sourceText);

            var patternStr = typeof highlightText === 'string' ?
                escapeHtmlRegexp(highlightText) :
                _.map(highlightText, escapeHtmlRegexp).join('|');
            var appliedModifiers = modifiers == null ? 'gi' : modifiers; // default modifiers: case-insensitive + global
            var pattern = new RegExp(patternStr, appliedModifiers);
            return AJS.escapeHtml(sourceText).replace(pattern, '<strong>$&</strong>');
        }
    };
});