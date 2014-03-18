define('util/text', [
    'underscore',
    'util/feature-detect'
], function (
    _,
    featureDetect
) {

    'use strict';

    return {
        // turn "hello world" into "Hello world"
        toSentenceCase : function (str) {
            str += '';
            if (!str) {
                return '';
            }
            return str.charAt(0).toUpperCase() + str.substring(1);
        },
        camelCaseToHyphenated: function(camelCaseString){
            //Prefix any uppercase character that is preceded by a character that is not a hyphen, underscore or whitespace with a hyphen and lowercase the whole string
            //Replace any spaces with hyphens but really, this is intended to be used with well-formed camelcase,
            //if you pass in rubbish it will do it's best to LITFA but it will probably not be able to be reliably reversed.
            //This should be kept in sync with the Java implementation in `camelCaseToHyphenatedFunction`
            if (typeof camelCaseString !== 'string') {
                return undefined;
            }

            // No positive lookbehind in JS? Lets hack positive lookahead to do what we want.
            // Instead of looking for an uppercase character preceeded by a non-space/hyphen/underscore,
            // look for a non-space/hyphen/underscore followed by an uppercase character and add a hyphen after it.
            return camelCaseString.replace(/([^\s\-_])(?=[A-Z])/g, '$1-').replace(/\s/, "-").toLowerCase();
        },
        indent : function (text, opt_numSpaces, opt_indentChar) {
            var numSpaces = (typeof opt_numSpaces === 'number' && isFinite(opt_numSpaces)) ? opt_numSpaces : 4, //If opt_numSpaces is not valid default to 4
                indentChar = (typeof opt_indentChar === 'string') ? opt_indentChar : ' ';

            if (typeof text !== 'string') {
                //trying to indent a non-string is undefined
                return undefined;
            }

            if (numSpaces < 0 ) {
                //if numSpaces is less than zero, return the original text
                return text;
            }

            return new Array(numSpaces + 1).join(indentChar) + text;
        },
        unindent : function(text, opt_numSpaces, opt_indentChar) {
            var numSpaces = (typeof opt_numSpaces === 'number' && isFinite(opt_numSpaces)) ? opt_numSpaces : 4, //If opt_numSpaces is not valid default to 4
                indentChar = (typeof opt_indentChar === 'string') ? opt_indentChar : ' ';

            if (typeof text !== 'string') {
                //trying to indent a non-string is undefined
                return undefined;
            }

            if (numSpaces < 0 ) {
                //if numSpaces is less than zero, return the original text
                return text;
            }

            while (text.charAt(0) === indentChar && numSpaces) {
                text = text.substring(1);
                numSpaces--;
            }

            return text;
        },
        formatSizeInBytes : function(size) {
            // Convert the size to the most appropriate unit ('n units' where n < magnitudeStep and n >= 1)
            // and round to 1 decimal only if needed (so `1.72` becomes `1.7`, but `1.02` becomes `1`)
            var units = [' bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
                magnitudeStep = 1024,
                orderOfMagnitude = 0,
                maxMagnitude = units.length - 1;

            size = (typeof size === 'number') ? size : parseInt(size, 10);

            if (isNaN(size)) {
                return '';
            }

            while (size >= magnitudeStep && orderOfMagnitude < maxMagnitude) {
                size /= magnitudeStep;
                orderOfMagnitude++;
            }

            size = Math.floor((size * 10)) / 10; //Reduce to 1 decimal place only if required.
            return size + units[orderOfMagnitude];
        },
        abbreviateText: function(text, maxLength, opt_replacement) {
            //Abbreviate the text by removing characters from the middle and replacing them with a single instance of the replacement,
            // so that the total width of the new string is <= to `maxLength`
            if (typeof text !== 'string') {
                //trying to abbreviate a non-string is undefined
                return undefined;
            }
            if (isNaN(maxLength) || maxLength < 0 || text.length <= maxLength  ) {
                //if maxLength is not a number or less than zero, or if the text is shorter than the maxLength, return the original text
                return text;
            }

            var replacement = (typeof opt_replacement === 'string') ? opt_replacement : '…',
                removedCharCount = text.length - maxLength + replacement.length,
                textCenter = Math.round(text.length/2);

            return text.substring(0, textCenter - Math.ceil(removedCharCount/2)) + replacement +
                text.substring(textCenter + Math.floor(removedCharCount/2), text.length);
        },
        convertBranchNameToSentence: function (branchName) {
            //Replace hyphens and underscores with spaces, except when they are inside an issue key. Convert to sentence case
            if (!branchName || typeof branchName !== 'string') {
                return '';
            }

            if (!featureDetect.splitCapture()){
                //If the browser can't handle capture groups in the split regex correctly, it just gets the original branch name (only affects IE8)
                return branchName;
            }

            var issueKeyRegex = /([A-Z]{1,10}-\d+)/,
                parts = _.map(branchName.split(issueKeyRegex), function(value, index) {
                    //Even indexed parts are non-issue-key strings, replace `-` and `_` with spaces
                    return (index % 2 === 0) ? value.replace(/[\-_]/g, ' ') : value;
                });

            return this.toSentenceCase(parts.join(''));
        },
        /**
         * @param {String} baseString the string to test
         * @param {String} searchString the string to search for
         * @returns {Boolean} whether the baseString ends with the searchString
         */
        endsWith: _.isFunction(String.prototype.endsWith) ?
            function(baseString, searchString) {
                return baseString.endsWith(searchString);
            } :
            function(baseString, searchString) {

                var lastIndex = baseString.lastIndexOf(searchString);
                return lastIndex !== -1 && lastIndex === (baseString.length - searchString.length);
            }
    };
});
