define('feature/file-content/diff-view/options-panel', [
    'util/deprecation',
    'feature/file-content/diff-view-options-panel'
], function(deprecate, segmentTypes) {

	deprecate.getMessageLogger(
		'feature/file-content/diff-view/options-panel',
        'feature/file-content/diff-view-options-panel', '2.11', '3.0')();

	return segmentTypes;
});

define('feature/file-content/diff-view-options-panel', [
    'chaperone',
    'jquery',
    'util/events',
    'feature/file-content/diff-view-options',
    'exports'
], function (
    Chaperone,
    $,
    events,
    diffViewOptions,
    exports
    ){

        var $document = $(document);
        var ddList = '#diff-options-dropdown';
        var ddCoreItems = '#diff-options-core a';
        var ddTrigger = '#diff-options-dropdown-trigger';

        // Update the diffOptions when an item is checked/unchecked
        function itemCheckStateChanged(e) {
            closeDiffViewOptions();
            var $el = $(this);
            var key = $el.attr('data-key');
            var val = $el.attr('data-value');
            var checked = (e.type === 'aui-dropdown2-item-check');

            if ($el.is('[role=radio]') && !checked) {
                return;
            }

            diffViewOptions.set(key, val || checked);
        }


        // Check/Uncheck options visually when the dropdown is shown.
        function optionsDropdownShown(e) {
            // If an item has a matching diff option set it to the value.
            // default to false
            $(this).find('#diff-options-core a').each(function() {
                var $el = $(this);
                var key = $el.attr('data-key');
                var val = $el.attr('data-value');
                var storedValue = diffViewOptions.get(key);
                var isChecked = (storedValue && (storedValue === val || storedValue === true));

                $el.toggleClass('checked', isChecked);


            });

            events.on('window.scroll.throttled', closeDiffViewOptions);
        }

        function optionsDropdownHidden(e) {
            events.off('window.scroll.throttled', closeDiffViewOptions);
        }

        /**
         * Close the Diff View Options dropdown
         *
         * When the page is scrolled or when the options have changed, we want to
         * close the menu to avoid having it open when the user gets back to the page.
         *
         * In this particular scenario, the toolbar that contains the dropdown
         * can become position:fixed. This detaches the dropdown from the button location
         * and causes it to float on the page by itself until the toolbar is no longer fixed.
         *
         * @param {Event} e
         */
        function closeDiffViewOptions(e) {
            if ($document.find(ddList).attr('aria-hidden') === 'false') {
                $document.find(ddTrigger).trigger('aui-button-invoke');
            }
        }


        /**
         * Toggle the whitespace option. This would be triggered from a keyboard shortcut
         */
        function toggleIgnoreWhitespace() {
            closeDiffViewOptions();
            diffViewOptions.set('ignoreWhitespace', !diffViewOptions.get('ignoreWhitespace'));
        }

        /**
         * Toggle the side-by-side-diff view. This would be triggered from a keyboard shortcut
         */
        function changeDiffType() {
            closeDiffViewOptions();
            diffViewOptions.set('diffType', diffViewOptions.get('diffType') === 'unified' ? 'side-by-side' : 'unified');
        }

        /**
         * Pick up keyboard shortcut registration for toggling the ignoring of whitespace in a diff.
         */
        function handleWhitespaceKeyboard(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(toggleIgnoreWhitespace);
        }

        function handleChangeDiffTypeKeyboard(keys) {
            (this.execute ? this : AJS.whenIType(keys)).execute(changeDiffType);
        }

        events.on('stash.keyboard.shortcuts.requestIgnoreWhitespace', handleWhitespaceKeyboard);
        events.on('stash.keyboard.shortcuts.changeDiffTypeRequested', handleChangeDiffTypeKeyboard);

        exports.init = function() {
            $document.on('aui-dropdown2-item-check aui-dropdown2-item-uncheck', ddCoreItems, itemCheckStateChanged);
            $document.on('aui-dropdown2-show', ddList, optionsDropdownShown);
            $document.on('aui-dropdown2-hide', ddList, optionsDropdownHidden);

            Chaperone.registerFeature('side-by-side-diff-discovery', [{
                id : 'side-by-side-diff-discovery',
                selector : ddTrigger,
                title : stash_i18n('stash.web.diff.side-by-side.feature.discovery.title', 'Side-by-side diff'),
                content : stash_i18n('stash.web.diff.side-by-side.feature.discovery.content',
                        'Stash has a new way to view diffs. Use this menu to try it.'),
                once: true
            }]);
        };

        exports.destroy = function() {
            $document.off('aui-dropdown2-item-check aui-dropdown2-item-uncheck', ddCoreItems, itemCheckStateChanged);
            $document.off('aui-dropdown2-show', ddList, optionsDropdownShown);
            $document.off('aui-dropdown2-hide', ddList, optionsDropdownHidden);
        };

});
