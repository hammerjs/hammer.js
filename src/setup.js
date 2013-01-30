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

    // Register all gestures inside Hammer.gestures
    for(var name in Hammer.gestures) {
        if(Hammer.gestures.hasOwnProperty(name)) {
            Hammer.gesture.register(Hammer.gestures[name]);
        }
    }

    // Add touch events on the window
    Hammer.event.onTouch(document.body, Hammer.TOUCH_MOVE, Hammer.gesture.detect);
    Hammer.event.onTouch(document.body, Hammer.TOUCH_END, Hammer.gesture.endDetect);

    // Hammer is ready...
    Hammer.READY = true;
}