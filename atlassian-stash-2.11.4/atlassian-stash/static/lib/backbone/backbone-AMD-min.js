define("backbone",["backbone-raw","util/ajax"],function(C,B){var A={create:"POST",read:"GET",update:"PUT","delete":"DELETE"};C.sync=function(G,E,F){var D=_.extend({url:_.isFunction(E.url)?E.url():E.url,type:A[G],data:E.toJSON()},F);return B.rest(D)};return C});