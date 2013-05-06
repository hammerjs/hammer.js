// node export
if(typeof module === 'object' && typeof module.exports === 'object'){
    module.exports = Hammer;
}
// export as AngularJS injectable module
else if(typeof angular === 'object') {
    angular.module('hammer', []).constant('Hammer', Hammer);
}
// just window export
else {
    window.Hammer = Hammer;

    // requireJS module definition
    if(typeof window.define === 'function' && window.define.amd) {
        window.define(function() {
            return Hammer;
        });
    }
}
})(this);
