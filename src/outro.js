
    // Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L5515-L5543
    // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        // define as an anonymous module
        define(function() {
            return Hammer;
        });
    // check for `exports` after `define` in case a build optimizer adds an `exports` object
    } else if(typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = Hammer;
    } else {
        window.Hammer = Hammer;
    }

})(this);