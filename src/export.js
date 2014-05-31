Hammer.EventEmitter = EventEmitter;
Hammer.Manager = Manager;
Hammer.Input = Input;
Hammer.TouchAction = TouchAction;

Hammer.Recognizer = Recognizer;
Hammer.AttrRecognizer = AttrRecognizer;
Hammer.Tap = TapRecognizer;
Hammer.Pan = PanRecognizer;
Hammer.Swipe = SwipeRecognizer;
Hammer.Pinch = PinchRecognizer;
Hammer.Rotation = RotationRecognizer;
Hammer.Hold = HoldRecognizer;

// expose some useful/over-writable methods
Hammer.on = addEventListeners;
Hammer.off = removeEventListeners;
Hammer.each = each;
Hammer.merge = merge;
Hammer.extend = extend;
Hammer.inherit = inherit;
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
