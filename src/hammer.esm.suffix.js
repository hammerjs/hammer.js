return Hammer;
})((typeof window !== 'undefined' && window) ? window : ((typeof self !== 'undefined' && self) ? self : {}), (typeof document !== 'undefined' && document) ? document : {});

if (typeof window !== 'undefined' && window) {
    try {
        window.Hammer = Hammer;
    } catch (e) {}
}

export default Hammer;
export const {
    VERSION, defaults,
    INPUT_START, INPUT_MOVE, INPUT_END, INPUT_CANCEL,
    STATE_POSSIBLE, STATE_BEGAN, STATE_CHANGED, STATE_ENDED, STATE_RECOGNIZED, STATE_CANCELLED, STATE_FAILED,
    DIRECTION_NONE, DIRECTION_LEFT, DIRECTION_RIGHT, DIRECTION_UP, DIRECTION_DOWN, DIRECTION_HORIZONTAL, DIRECTION_VERTICAL, DIRECTION_ALL,
    Manager, Input, TouchAction,
    TouchInput, MouseInput, PointerEventInput, TouchMouseInput, SingleTouchInput,
    Recognizer, AttrRecognizer, Tap, Pan, Swipe, Pinch, Rotate, Press,
    on, off, each, merge, extend, assign, inherit, bindFn, prefixed
} = Hammer;
