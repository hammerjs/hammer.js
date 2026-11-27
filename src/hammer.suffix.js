// Expose on global even when loaded via script tag alongside an AMD loader
try {
    window[exportName] = Hammer;
} catch (e) {}

if (typeof define === 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != 'undefined' && module.exports) {
    module.exports = Hammer;
}
})((typeof window !== 'undefined' && window) ? window : ((typeof self !== 'undefined' && self) ? self : {}), (typeof document !== 'undefined' && document) ? document : {}, 'Hammer');
