// if the window events are set...
Hammer.READY = false;

/**
 * setup events to detect gestures on the document
 * @return
 */
function setup() {
    if(Hammer.READY) {
        return;
    }

    Hammer.event.onTouch(window, Hammer.TOUCH_MOVE, Hammer.gesture.detect);
    Hammer.event.onTouch(window, Hammer.TOUCH_END, Hammer.gesture.endDetect);

    // Hammer is ready...
    Hammer.READY = true;
}