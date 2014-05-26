Hammer.Instance = Instance;

Hammer.PanRecognizer = PanRecognizer;
Hammer.SwipeRecognizer = SwipeRecognizer;
Hammer.TransformRecognizer = TransformRecognizer;
Hammer.TapRecognizer = TapRecognizer;

// expose some methods
Hammer.each = each;
Hammer.merge = merge;
Hammer.bindFn = bindFn;
Hammer.prefixed = prefixed;

// export to amd/module/window
if(typeof define == TYPE_FUNCTION && define.amd) {
    define(function() {
        return Hammer;
    });
} else if(typeof module != TYPE_UNDEFINED && module.exports) {
    module.exports = Hammer;
} else {
    window.Hammer = Hammer;
}
