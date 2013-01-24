hammer.READY = false;


/**
 * setup events to detect gestures on the document
 * @return
 */
function setup() {
    if(hammer.READY) {
        return;
    }

    Event.onTouch(window, hammer.TOUCH_MOVE, Gesture.detect);
    Event.onTouch(window, hammer.TOUCH_END, Gesture.endDetect);

    // hammer is ready...
    hammer.READY = true;
}