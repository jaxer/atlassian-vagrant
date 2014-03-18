define('model/path', function() {

    'use strict';

    function Path(stringOrArray) {
        var components = [];
        if (stringOrArray instanceof Array) {
            components = stringOrArray;

        } else if (stringOrArray) {
            if (stringOrArray.split) {
                components = stringOrArray.length ? stringOrArray.split(this._separator) : [];

                if (components.length) { //normalize - remove leading and trailing slashes.
                    if (!components[components.length - 1]) {
                        components.pop();
                    }
                    if (!components[0]) {
                        components.shift();
                    }
                }

            } else if (stringOrArray._components) {
                components = stringOrArray._components;

            } else if (stringOrArray.components) {
                components = stringOrArray.components;
            }
        }

        this._components = components;
    }
    Path.prototype._separator = '/';

    Path.fromParentAndName = function(parentPath, name) {
        var components = parentPath._components.slice(0);
        components.push(name);

        return new Path(components);
    };

    Path.prototype.getComponents = function() {
        return this._components.slice(0);
    };

    Path.prototype.getName = function() {
        return this._components.length ? this._components[this._components.length - 1] : null;
    };

    Path.prototype.getParent = function() {
        return this._components.length ?
               new Path(this._components.slice(0, this._components.length - 1)) :
               null;
    };

    Path.prototype.isSameDirectory = function(otherPath) {

        if (this._components.length !== otherPath._components.length) {
            return false;
        }

        var i = this._components.length - 2;
        while(i >= 0 && this._components[i] === otherPath._components[i]) i--;

        return i < 0;
    };

    Path.prototype.toString = function() {
        return this._components.join(this._separator);
    };

    return Path;
});
