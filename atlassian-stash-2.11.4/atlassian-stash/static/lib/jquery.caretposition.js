/**
 * jQuery plugin for getting position of cursor in textarea

 * @license under Apache license http://www.apache.org/licenses/LICENSE-2.0
 * @author Bevis Zhao (i@bevis.me, http://bevis.me)
 *
 * Modified by Atlassian
 */
(function($) {
    
    var calculator = {
        // key styles
        primaryStyles: ['fontFamily', 'fontSize', 'fontWeight', 'fontVariant', 'fontStyle',
            'paddingLeft', 'paddingTop', 'paddingBottom', 'paddingRight',
            'marginLeft', 'marginTop', 'marginBottom', 'marginRight',
            'borderLeftColor', 'borderTopColor', 'borderBottomColor', 'borderRightColor',
            'borderLeftStyle', 'borderTopStyle', 'borderBottomStyle', 'borderRightStyle',
            'borderLeftWidth', 'borderTopWidth', 'borderBottomWidth', 'borderRightWidth',
            'lineHeight', 'outline', 'letterSpacing', 'wordSpacing', 'textAlign', 'verticalAlign'],

        specificStyle: {
            'word-wrap': 'break-word',
            'overflow-x': 'hidden',
            'overflow-y': 'auto'
        },

        toHtml : function(text) {
            return text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>')
                    .split(' ').join('<span style="white-space:prev-wrap">&nbsp;</span>');
        },
        // calculate position
        getCaretPosition: function(cursorPositionOffset) {
            var cal = calculator, self = this, element = self[0], elementOffset = self.offset();

            // IE has easy way to get caret offset position
            if ($.browser.msie) {
                // must get focus first
                if(element !== document.activeElement) {
                    //ATLASSIAN CHANGE
                    //Only reset the focus if the element didn't already have focus,
                    //prevents IE scrolling the element into view, which can throw out the offset
                    element.focus();
                }
                var range = document.selection.createRange();
                $('#hskeywords').val(element.scrollTop);
                return {
                    left: (range.boundingLeft) - elementOffset.left,
                    top: parseInt(range.boundingTop) - elementOffset.top + element.scrollTop
                            + document.documentElement.scrollTop + parseInt(self.getComputedStyle("fontSize"))
                };
            }
            cal.simulator.empty();
            // clone primary styles to imitate textarea
            $.each(cal.primaryStyles, function(index, styleName) {
                self.cloneStyle(cal.simulator, styleName);
            });

            // caculate width and height
            cal.simulator.css($.extend({
                'width': self.width(),
                'height': self.height()
            }, cal.specificStyle));

            cursorPositionOffset = cursorPositionOffset || 0;
            var value = self.val(), cursorPosition = self.getCursorPosition() + cursorPositionOffset;
            var beforeText = value.substring(0, cursorPosition),
                    afterText = value.substring(cursorPosition);

            var before = $('<span class="before"/>').html(cal.toHtml(beforeText)),
                    focus = $('<span class="focus"/>'),
                    after = $('<span class="after"/>').html(cal.toHtml(afterText));

            cal.simulator.append(before).append(focus).append(after);
            var focusOffset = focus.offset(), simulatorOffset = cal.simulator.offset();
            // alert(focusOffset.left  + ',' +  simulatorOffset.left + ',' + element.scrollLeft);
            return {
                top: focusOffset.top - simulatorOffset.top - element.scrollTop
                    // calculate and add the font height except Firefox
                        + parseInt(self.getComputedStyle("fontSize")),
                left: focus[0].offsetLeft -  cal.simulator[0].offsetLeft - element.scrollLeft
            };
        }
    };

    $(function() {
        calculator.simulator = $('<div id="textarea_simulator"/>').css({
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: 'hidden'
        }).appendTo(document.body);
    });

    $.fn.extend({
        getComputedStyle: function(styleName) {
            if (this.length == 0) {
                return;
            }
            var thiz = this[0];
            var result = this.css(styleName);
            result = result || ($.browser.msie ?
                    thiz.currentStyle[styleName]:
                    document.defaultView.getComputedStyle(thiz, null)[styleName]);
            return result;
        },
        // easy clone method
        cloneStyle: function(target, styleName) {
            var styleVal = this.getComputedStyle(styleName);
            if (!!styleVal) {
                $(target).css(styleName, styleVal);
            }
        },
        cloneAllStyle: function(target, style) {
            var thiz = this[0];
            for (var styleName in thiz.style) {
                var val = thiz.style[styleName];
                typeof val == 'string' || typeof val == 'number'
                        ? this.cloneStyle(target, styleName)
                        : NaN;
            }
        },
        getCursorPosition : function() {
            var thiz = this[0], result = 0;
            if ('selectionStart' in thiz) {
                result = thiz.selectionStart;
            } else if('selection' in document) {
                var range = document.selection.createRange();
                if (parseInt($.browser.version) > 6) {
                    thiz.focus();
                    var length = document.selection.createRange().text.length;
                    range.moveStart('character', - thiz.value.length);
                    result = range.text.length - length;
                } else {
                    var bodyRange = document.body.createTextRange();
                    bodyRange.moveToElementText(thiz);
                    for (; bodyRange.compareEndPoints("StartToStart", range) < 0; result++)
                        bodyRange.moveStart('character', 1);
                    for (var i = 0; i <= result; i++) {
                        if (thiz.value.charAt(i) == '\n') {
                            result++;
                        }
                    }
                    var enterCount = thiz.value.split('\n').length - 1;
                    result -= enterCount;
                    return result;
                }
            }
            return result;
        },
        getCaretPosition: calculator.getCaretPosition
    });
})(jQuery);