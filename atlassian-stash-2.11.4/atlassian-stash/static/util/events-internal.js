// This file exists so we can add it as a dependency of 'util/events' and inject Eve into the dependency chain without listing 'eve' as a dependency
// We don't want to list eve as a dependency because we have a separate 'eve' module that provides a deprecated copy of eve, rather than the raw one.
// <web-resources> handles the situation without this file, but QUnit + RequireJS requires something to request eve in the JS itself.
define('util/events/internal', function() {
    
    "use strict";

    return window.eve;
});