define('util/focus-snapshot', [
    'jquery'
], function(
    $
) {

    'use strict';

    return (function() {
        var $el, selection;
        return {
            save: function() {
                var element =  document.activeElement;
                if (element) {
                    $el = $(element);
                    if ($el.is(':text, textarea')) {
                        selection = $el.getSelection(); // requires rangy (rangy-input.js)
                    }
                }
            },
            restore: function() {
                if ($el) {
                    $el.focus();
                    if (selection) {
                        $el.setSelection(selection.start, selection.end);
                    }
                }
            }
        };
    })();

});
