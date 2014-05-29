/**
 * set and mimic the touch-action property
 */

var NATIVE_TOUCH_ACTION = prefixed(document.body.style, 'touchAction');

function TouchAction(inst) {
    this.inst = inst;
    this.setValue(inst.options.touchAction);
}

TouchAction.prototype = {
    setValue: function(value) {
        this.value = value.toLowerCase();

        if(NATIVE_TOUCH_ACTION) {
            prefixed(this.inst.element.style, 'touchAction', value);
        }
    },

    update: function(inputData) {
        var event = inputData.srcEvent;
        var touchAction = this.value;

        // not needed for native and mouse input
        if(NATIVE_TOUCH_ACTION ||
            touchAction == 'auto' ||
            inputData.pointerType == INPUT_TYPE_MOUSE ||
            inputData.eventType === INPUT_START) {
            return;
        }

        // if the touch action did prevented once this session,
        // prevent it everytime
        if(this.inst.session.prevented) {
            event.preventDefault();
            return;
        }

        var isPanY = inStr(touchAction, 'pan-y');
        var isPanX = inStr(touchAction, 'pan-x');
        var isNone = inStr(touchAction, 'none');

        var direction = inputData.direction;

        // 'none', just prevent anything
        if(isNone) {
            this.preventDefault(event);
        }

        // 'pan-y' or 'pan-x'
        if(inputData.eventType === INPUT_MOVE && (
            (isPanY && (direction == DIRECTION_LEFT || direction == DIRECTION_RIGHT)) ||
            (isPanX && (direction == DIRECTION_UP || direction == DIRECTION_DOWN)
        ))) {
            this.preventDefault(event);
        }
    },

    /**
     * call preventDefault and save in the session
     * @param {Object} event
     */
    preventDefault: function(event) {
        this.inst.session.prevented = true;
        event.preventDefault();
    }
};
