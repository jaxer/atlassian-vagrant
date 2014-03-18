define('model/project', [
    'backbone-brace',
    'model/stash-user',
    'util/deprecation'
], function(
    Brace,
    StashUser,
    deprecate
    ) {

    'use strict';

    var Project = Brace.Model.extend({
        namedAttributes : {
            'id' : 'number',
            'name' : 'string',
            'key' : 'string',
            'description' : 'string',
            'type' : 'string',
            'isPersonal' : 'boolean',   //deprecated in 2.4, removal in 3.0, use type === Project.projectType.PERSONAL instead
            'owner' : StashUser,
            'avatarUrl' : 'string',
            'link' : Object,
            'links' : Object,
            'public' : 'boolean'
        },
        isEqual: function(project){
            return !!(project && project instanceof Project && this.id === project.id);
        }
    }, {
        projectType: {
            NORMAL: 'NORMAL',
            PERSONAL: 'PERSONAL'
        }
    });

    deprecate.braceAttribute(Project, 'isPersonal', 'type === Project.projectType.PERSONAL', '2.4',  '3.0');

    deprecate.braceAsJson(Project, 'Project', '2.4', '3.0');

    return Project;
});