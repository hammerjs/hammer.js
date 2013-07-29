// Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L111-L141
// and - https://github.com/bestiejs/lodash/blob/master/lodash.js#L6328-L6356
// some AMD build optimizers, like r.js, check for specific condition patterns like the following:
/** Used to determine if values are of the language type Object */
var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
};
if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Hammer to the global object even when an AMD loader is present in
    // case Hammer was injected by a third-party script and not intended to be
    // loaded as a module.
    window.Hammer = Hammer;

    // define as an anonymous module
    define(function() {
        return Hammer;
    });
}
// check for `exports` after `define` in case a build optimizer adds an `exports` object
else if(module && objectTypes[typeof module] && module.exports && objectTypes[typeof module.exports]) {
    module.exports = Hammer;
}
else {
    window.Hammer = Hammer;
}
})(this);
