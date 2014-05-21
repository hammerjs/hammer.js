/**
 * Touch and mouse events input
 * @param inst
 * @param callback
 * @constructor
 */
Input.TouchMouse = function(inst, callback) {
    this.callback = callback;

    this._handler = bindFn(this.handler, this);
    this._mouse = new Input.Mouse(inst, this._handler);
    this._touch = new Input.Touch(inst, this._handler);

    this._allowMouse = true;
};

Input.TouchMouse.prototype = {
    /**
     * handle mouse and touch events
     * @param inst
     * @param inputType
     * @param inputData
     */
    handler: function(inst, inputType, inputData) {
        var isTouch = (inputData.pointerType == 'touch'),
            isMouse = (inputData.pointerType == 'mouse');


        // when we're in a touch event, so  block all upcoming mouse events
        // most mobile browser also trigger mouseevents, right after touchstart
        if(isTouch) {
            this._allowMouse = false;
        } else if(isMouse && !this._allowMouse) {
            return;
        }

        // reset the allowMouse when we're done
        if(inputType == 'end') {
            this._allowMouse = true;
        }

        this.callback(inst, inputType, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        this._mouse.destroy();
        this._touch.destroy();
    }
};
