// Expose on global even when loaded via script tag alongside an AMD loader
window[exportName] = Hammer;

if (typeof define === 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != 'undefined' && module.exports) {
    module.exports = Hammer;
}
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {}), typeof document !== 'undefined' ? document : {}, 'Hammer');
