(function(eve, memoir) {
    memoir.bind('memoir.popstate', function(e) {
        eve('memoir.popstate', this, e);
    });
    memoir.bind('memoir.changestate', function(e) {
        eve('memoir.changestate', this, e);
    });
})(window.eve || require('eve'), window.memoir || require('memoir'));
