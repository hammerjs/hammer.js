if(typeof define == "function" && define.amd) {
    define(function() {
        return Hammer;
    });
} else if(typeof module !== "undefined" && module.exports) {
    module.exports = Hammer;
} else {
    window.Hammer = Hammer;
}
