extend(Hammer, {
    /** @const {Number} Hammer.INPUT_START 1 */
    INPUT_START: INPUT_START,
    /** @const {Number} Hammer.INPUT_MOVE 2 */
    INPUT_MOVE: INPUT_MOVE,
    /** @const {Number} Hammer.INPUT_END 4 */
    INPUT_END: INPUT_END,
    /** @const {Number} Hammer.INPUT_CANCEL 8 */
    INPUT_CANCEL: INPUT_CANCEL,

    /** @const {Number} Hammer.STATE_POSSIBLE 1 */
    STATE_POSSIBLE: STATE_POSSIBLE,
    /** @const {Number} Hammer.STATE_BEGAN 2 */
    STATE_BEGAN: STATE_BEGAN,
    /** @const {Number} Hammer.STATE_CHANGED 4 */
    STATE_CHANGED: STATE_CHANGED,
    /** @const {Number} Hammer.STATE_ENDED 8 */
    STATE_ENDED: STATE_ENDED,
    /** @const {Number} Hammer.STATE_RECOGNIZED 8 */
    STATE_RECOGNIZED: STATE_RECOGNIZED,
    /** @const {Number} Hammer.STATE_CANCELLED 16 */
    STATE_CANCELLED: STATE_CANCELLED,
    /** @const {Number} Hammer.STATE_FAILED 32 */
    STATE_FAILED: STATE_FAILED,

    /** @const {Number} Hammer.DIRECTION_NONE 1 */
    DIRECTION_NONE: DIRECTION_NONE,
    /** @const {Number} Hammer.DIRECTION_LEFT 2 */
    DIRECTION_LEFT: DIRECTION_LEFT,
    /** @const {Number} Hammer.DIRECTION_RIGHT 4 */
    DIRECTION_RIGHT: DIRECTION_RIGHT,
    /** @const {Number} Hammer.DIRECTION_UP 8 */
    DIRECTION_UP: DIRECTION_UP,
    /** @const {Number} Hammer.DIRECTION_DOWN 16 */
    DIRECTION_DOWN: DIRECTION_DOWN,
    /** @const {Number} Hammer.DIRECTION_HORIZONTAL 6 */
    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
    /** @const {Number} Hammer.DIRECTION_VERTICAL 24 */
    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
    /** @const {Number} Hammer.DIRECTION_ALL 30 */
    DIRECTION_ALL: DIRECTION_ALL,

    /** @member {Manager} Hammer.Manager */
    Manager: Manager,
    /** @member {Input} Hammer.Input */
    Input: Input,
    /** @member {TouchAction} Hammer.TouchAction */
    TouchAction: TouchAction,

    /** @member {Recognizer} Hammer.Recognizer */
    Recognizer: Recognizer,
    /** @member {AttrRecognizer} Hammer.AttrRecognizer */
    AttrRecognizer: AttrRecognizer,
    /** @member {TapRecognizer} Hammer.Tap */
    Tap: TapRecognizer,
    /** @member {PanRecognizer} Hammer.Pan */
    Pan: PanRecognizer,
    /** @member {SwipeRecognizer} Hammer.Swipe */
    Swipe: SwipeRecognizer,
    /** @member {PinchRecognizer} Hammer.Pinch */
    Pinch: PinchRecognizer,
    /** @member {RotateRecognizer} Hammer.Rotate */
    Rotate: RotateRecognizer,
    /** @member {PressRecognizer} Hammer.Press */
    Press: PressRecognizer,

    /** @member {addEventListeners} Hammer.on */
    on: addEventListeners,
    /** @member {removeEventListeners} Hammer.off */
    off: removeEventListeners,
    /** @member {each} Hammer.each */
    each: each,
    /** @member {merge} Hammer.merge */
    merge: merge,
    /** @member {extend} Hammer.extend */
    extend: extend,
    /** @member {inherit} Hammer.inherit */
    inherit: inherit,
    /** @member {bindFn} Hammer.bindFn */
    bindFn: bindFn,
    /** @member {prefixed} Hammer.prefixed */
    prefixed: prefixed
});

if (typeof define == TYPE_FUNCTION && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != TYPE_UNDEFINED && module.exports) {
    module.exports = Hammer;
} else {
    window.Hammer = Hammer;
}
