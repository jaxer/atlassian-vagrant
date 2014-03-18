/**
 * @deprecated since 2.3. Use the 'util/events' module instead.
 */
define('eve', ['util/deprecation'], function (deprecate) {
    var eveIn = window.eve;
    var eveOut = deprecate.fn(eveIn, 'eve', "util/events:trigger", "2.4");

    var props = [ 'nt', /*'nts',*/ 'on', 'off', 'listeners', 'unbind', 'stop', 'once' ];
    for (var i = 0, len = props.length; i < len; i++) {
        eveOut[props[i]] = deprecate.fn(eveIn[props[i]], 'eve.' + props[i], "util/events:" + props[i], '2.4');
    }
    eveOut.version = eveIn.version;
    eveOut.toString = eveIn.toString;

    return eveOut;
});