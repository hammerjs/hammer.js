/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also trigger mouse events while doing a touch.
 *
 * @constructor
 */
function TouchMouseInput() {
    Input.apply(this, arguments);

    this.touch = new Input.Touch(this.inst, this._handler);
    this.mouse = new Input.Mouse(this.inst, this._handler);
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} inst
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function(inst, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        // when we're in a touch event, so  block all upcoming mouse events
        // most mobile browser also trigger mouseevents, right after touchstart
        if(isTouch) {
            this.mouse._allow = false;
        } else if(isMouse && !this.mouse._allow) {
            return;
        }

        // reset the allowMouse when we're done
        if(inputEvent == EVENT_END) {
            this.mouse._allow = true;
        }

        this.callback(inst, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});
