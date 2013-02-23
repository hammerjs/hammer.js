// Expose Hammer to the global object
window.Hammer = Hammer;

// requireJS module definition
if(typeof window.define === 'function' && window.define.amd) {
	window.define('hammer', [], function() {
        return Hammer;
    });
}

})(window);