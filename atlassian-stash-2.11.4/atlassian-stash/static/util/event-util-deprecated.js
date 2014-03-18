define('util/event', [
    'util/deprecation',
    'util/dom-event'
], function (
    deprecate,
    domEventUtil
) {

    'use strict';

    var clone = {
        /** @deprecated */
        openInSameTab : domEventUtil.openInSameTab,
        /** @deprecated */
        modifiersPreventScroll : domEventUtil.modifiersPreventScroll,
        /** @deprecated */
        listenForFontSizeChange:domEventUtil.listenForFontSizeChange
    };
    deprecate.obj(clone, 'util/event::', 'util/dom-event::', '2.3', '3.0');

    return clone;
});
