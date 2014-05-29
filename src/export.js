Hammer.Instance = Instance;

Hammer.AttrRecognizer = AttrRecognizer;
Hammer.TapRecognizer = TapRecognizer;
Hammer.PanRecognizer = PanRecognizer;
Hammer.SwipeRecognizer = SwipeRecognizer;
Hammer.PinchRecognizer = PinchRecognizer;
Hammer.RotationRecognizer = RotationRecognizer;
Hammer.LongPressRecognizer = LongPressRecognizer;

Hammer.RecognizerGroup = RecognizerGroup;

// expose some useful methods
Hammer.addEvent = addEvent;
Hammer.removeEvent = removeEvent;
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
