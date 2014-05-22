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

        var TA_PAN_Y = inStr(touchAction, 'pan-y');
        var TA_PAN_X = inStr(touchAction, 'pan-x');
        var TA_NONE = inStr(touchAction, 'none');
        var TA_MANIPULATION = inStr(touchAction, 'manipulation');

        // 'none' and 'pan-y pan-x'
        if(TA_NONE || (TA_PAN_Y && TA_PAN_X)) {
            this.preventDefault(event);
        }

        // 'pan-y' or 'pan-x'
        var direction = inputData.direction;
        if((TA_PAN_Y && (direction == DIRECTION_LEFT || direction == DIRECTION_RIGHT))
           || (TA_PAN_X && (direction == DIRECTION_UP || direction == DIRECTION_DOWN))) {
            this.preventDefault(event);
        }

        // 'manipulation'
        if(TA_MANIPULATION && event.type == 'touchend') {
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
