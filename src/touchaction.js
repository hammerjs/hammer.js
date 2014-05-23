/**
 * set and mimic the touch-action property
 */

var NATIVE_TOUCHACTION = ("touchAction" in document.body.style) || ("msTouchAction" in document.body.style);

function TouchAction(inst, value) {
    this.inst = inst;
    this.setValue(value);
}

TouchAction.prototype = {
    setValue: function(value) {
        this.value = value;

        if(NATIVE_TOUCHACTION) {
            var style = this.inst.element.style;
            style.touchAction = value;
            style.msTouchAction = value;
        }
    },

    update: function(inputData) {
        if(!NATIVE_TOUCHACTION) {
            return;
        }

        var event = inputData._event;
        var touchAction = this.value;

        // if the touch action did prevented once this session,
        // prevent it everytime
        if(this.inst.sessions[0].ta_prevented) {
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
        if((isPanY && (direction == DIRECTION_LEFT || direction == DIRECTION_RIGHT))
           || (isPanX && (direction == DIRECTION_UP || direction == DIRECTION_DOWN))) {
            this.preventDefault(event);
        }

        // 'manipulation'
        if(isManipulation && event.type == 'touchend') {
            this.preventDefault(event);
        }
    },

    /**
     * preventdefault and save in the session
     * @param event
     */
    preventDefault: function(event) {
        this.inst.sessions[0].ta_prevented = true;
        event.preventDefault();
    }
};
