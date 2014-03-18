define('feature/admin/db/editDbConfig',
['underscore', 'jquery', 'exports'],
function(_, $, exports) {

    function toggleDriverUnavailable(dbType) {
        var $type = $("#type"),
            $container = $type.closest('.field-group').parent();
        $type.siblings('.driver-unavailable')
            .toggleClass('hidden', dbType.driverAvailable)
            .find('.help-url')
            .attr('href', dbType.helpUrl);
        $container.find("input").add($("#test,#submit")).toggleClass('disabled', !dbType.driverAvailable)
            .prop('disabled', !dbType.driverAvailable);
    }

    function toggleDatabaseLabel(dbType) {
        // Replace the text in the first textNode. Using .text() will remove all innerHtml
        var $fieldGroup = $('#database').closest('.field-group');
        var $label = $fieldGroup.children('label');
        var $labelChildren = $label.children();
        var $description = $fieldGroup.children('.description');
        var labelText;
        var descriptionText;
        if (dbType.usesSid) {
            labelText = stash_i18n('stash.web.admin.db.service.label', 'Service');
            descriptionText = stash_i18n('stash.web.admin.db.service.description', 'Oracle Service Identifier. Example: ORCL or XE');
        } else {
            labelText = stash_i18n('stash.web.admin.db.database.label', 'Database name');
            descriptionText = stash_i18n('stash.web.admin.db.database.description', '');
        }
        $label.text(labelText).append($labelChildren);
        $description.text(descriptionText);

    }

    function fillDefaultsInFields(oldDbType, newDbType) {
        var defaults = newDbType.defaults;
        _.forEach(oldDbType.defaults, function(defaultValue, fieldName) {
            var $field = $('#' + fieldName);
            var val = $field.val();
            if (val === defaultValue) {
                $field.val(defaults[fieldName] || '');
            }
        });
    }

    exports.onReady = function(dbTypes) {
        var $typeField = $("#type"),
            dbTypeByKey = {};
        _.forEach(dbTypes, function(dbType) {
            dbTypeByKey[dbType.key] = dbType;
        });
        var selectedDbType = dbTypeByKey[$typeField.val()];
        $typeField.on('change', function() {
            var newDbType = dbTypeByKey[$(this).val()];
            toggleDatabaseLabel(newDbType);
            fillDefaultsInFields(selectedDbType, newDbType);
            toggleDriverUnavailable(newDbType);
            selectedDbType = newDbType;
        });
    };
});
