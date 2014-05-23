/**
 * set and mimic the touch-action property
 */

var BODY_STYLE = document.body.style;
var NATIVE_TOUCH_ACTION = ('touchAction' in BODY_STYLE) || ('msTouchAction' in BODY_STYLE);

function TouchAction(inst, value) {
    this.inst = inst;
    this.setValue(value);
}

TouchAction.prototype = {
    setValue: function(value) {
        this.value = value;

        if(NATIVE_TOUCH_ACTION) {
            var style = this.inst.element.style;
            style.touchAction = value;
            style.msTouchAction = value;
        }
    },

    update: function(inputData) {
        var event = inputData._event;
        var touchAction = this.value;

        // not needed for native and mouse input
        if(!NATIVE_TOUCH_ACTION || inputData.pointerType == INPUT_TYPE_MOUSE) {
            return;
        }

        // if the touch action did prevented once this session,
        // prevent it everytime
        if(this.inst.sessions[0].prevented) {
            event.preventDefault();
        }

        var isPanY = inStr(touchAction, 'pan-y');
        var isPanX = inStr(touchAction, 'pan-x');
        var isNone = inStr(touchAction, 'none');
        var isManipulation = inStr(touchAction, 'manipulation');

        // 'none' and 'pan-y pan-x'
        if(isNone || (isPanY && isPanX)) {
            this.preventDefault(event);
        }

        // 'pan-y' or 'pan-x'
        var direction = inputData.direction;
        if((isPanY && (direction == DIRECTION_LEFT || direction == DIRECTION_RIGHT)) ||
            (isPanX && (direction == DIRECTION_UP || direction == DIRECTION_DOWN))) {
            this.preventDefault(event);
        }

        // 'manipulation'
        // only on touchend we want to prevent the default
        // it should then remove the 300ms (@todo check this)
        if(isManipulation && event.type == 'touchend') {
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
