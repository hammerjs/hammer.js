/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 */
function TouchMouseInput() {
    Input.apply(this, arguments);

    this.touch = new TouchInput(this.manager, this._handler);
    this.mouse = new MouseInput(this.manager, this._handler);
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function(manager, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        // when we're in a touch event, so  block all upcoming mouse events
        // most mobile browser also emit mouseevents, right after touchstart
        if(isTouch) {
            this.mouse.allow = false;
        } else if(isMouse && !this.mouse.allow) {
            return;
        }

        // reset the allowMouse when we're done
        if(inputEvent & INPUT_END) {
            this.mouse.allow = true;
        }

        this.callback(manager, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});
