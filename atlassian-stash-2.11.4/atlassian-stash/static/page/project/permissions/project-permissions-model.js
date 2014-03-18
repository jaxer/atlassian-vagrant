define('page/project/permissions/project-permissions-model',
    ['underscore', 'backbone-brace', 'util/ajax', 'util/navbuilder'],
    function(_, Brace, ajax, nav) {
        var ProjectPermissionsModel = Brace.Model.extend({
            namedAttributes: {
                grantedDefaultPermission: 'string',
                publicAccess: 'boolean'
            },

            getEffectiveDefaultPermission: function() {
                return this.getPublicAccess() && this.getGrantedDefaultPermission() === ProjectPermissionsModel.NONE ?
                        ProjectPermissionsModel.READ :
                        this.getGrantedDefaultPermission();
            },

            savePublicAccess: function(allow) {
                var previouslyAllowed = this.getPublicAccess();
                this.setPublicAccess(allow);
                return ProjectPermissionsModel._sendSavePublicAccessRequest(allow).fail(_.bind(function() {
                    // Revert on failure
                    this.setPublicAccess(previouslyAllowed);
                }, this));
            },

            saveDefaultPermission: function(permission) {
                var perms = ProjectPermissionsModel.unpackPermission(permission);
                var model = this;
                var previousPermission = this.getGrantedDefaultPermission();

                this.setGrantedDefaultPermission(permission);

                // Attempt to save read permission
                return ProjectPermissionsModel._sendSavePermissionRequest(permsNavBuilder().projectRead().all(), perms.read).then(function() {
                    // Saving read permission succeeded, attempt to save write permission
                    return ProjectPermissionsModel._sendSavePermissionRequest(permsNavBuilder().projectWrite().all(), perms.write).fail(function() {
                        // Saving read permission succeeded, but write failed - revert the write part
                        var writePreviouslyAllowed = ProjectPermissionsModel.unpackPermission(previousPermission).write;
                        perms.write = writePreviouslyAllowed;
                        model.setGrantedDefaultPermission(ProjectPermissionsModel.packPermission(perms));
                    });
                }, function() {
                    // Saving read permission failed
                    model.setGrantedDefaultPermission(previousPermission);
                });
            }
        }, {
            WRITE: 'write',
            READ: 'read',
            NONE: 'none',

            /**
             * Given a single permission level (WRITE, READ or NONE) returns individual boolean values for
             * whether write or read is allowed.
             */
            unpackPermission: function(permission) {
                return {
                    read: permission === ProjectPermissionsModel.WRITE || permission === ProjectPermissionsModel.READ,
                    write: permission === ProjectPermissionsModel.WRITE
                };
            },

            /**
             * Given individual boolean values for whether write or read is allowed, returns the corresponding
             * permission level (WRITE, READ or NONE).
             */
            packPermission: function(permissions) {
                return permissions.write ? ProjectPermissionsModel.WRITE :
                        permissions.read ? ProjectPermissionsModel.READ :
                                ProjectPermissionsModel.NONE;
            },

            _sendSavePermissionRequest: function(permsNavBuilder, allow) {
                return ajax.rest({
                    type: 'POST',
                    url: permsNavBuilder.allow(allow).build()
                });
            },

            _sendSavePublicAccessRequest: function(allow) {
                return ajax.rest({
                    type: 'PUT',
                    url: nav.rest().currentProject().build(),
                    data: {
                        'public': allow
                    }
                });
            }
        });

        function permsNavBuilder() {
            return nav.rest().currentProject().permissions();
        }

        return ProjectPermissionsModel;
    });
