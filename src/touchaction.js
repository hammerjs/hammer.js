/**
 * set and mimic the touch-action property
 */

var NATIVE_TOUCH_ACTION = prefixed("touchAction", document.body.style);

function TouchAction(inst) {
    this.inst = inst;
    this.setValue(inst.options.touchAction);
}

TouchAction.prototype = {
    setValue: function(value) {
        this.value = value.toLowerCase();

        if(NATIVE_TOUCH_ACTION) {
            prefixed("touchAction", this.inst.element.style, value);
        }
    },

    update: function(inputData) {
        var event = inputData.srcEvent;
        var touchAction = this.value;

        // not needed for native and mouse input
        if(NATIVE_TOUCH_ACTION ||
            touchAction == 'auto' ||
            inputData.pointerType == INPUT_TYPE_MOUSE ||
            inputData.srcEventType === SRC_EVENT_START) {
            return;
        }

        // if the touch action did prevented once this session,
        // prevent it everytime
        if(this.inst.sessions[0].prevented) {
            event.preventDefault();
        }

        var isPanY = inStr(touchAction, "pan-y");
        var isPanX = inStr(touchAction, "pan-x");
        var isNone = inStr(touchAction, "none");
        var isManipulation = inStr(touchAction, "manipulation");

        // "none" and "pan-y pan-x"
        if(isNone || (isPanY && isPanX)) {
            this.preventDefault(event);
        }

        // "pan-y" or "pan-x"
        var direction = inputData.direction;
        if((isPanY && (direction == DIRECTION_LEFT || direction == DIRECTION_RIGHT)) ||
            (isPanX && (direction == DIRECTION_UP || direction == DIRECTION_DOWN))) {
            this.preventDefault(event);
        }

        // "manipulation"
        // only on touchend we want to prevent the default
        // it should then remove the 300ms (@todo check this)
        if(isManipulation && event.type == "touchend") {
            this.preventDefault(event);
        }
    },

    /**
     * call preventDefault and save in the session
     * @param {Object} event
     */
    preventDefault: function(event) {
        this.inst.sessions[0].prevented = true;
        event.preventDefault();
    }
};
