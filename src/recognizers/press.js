/**
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 * @extends Recognizer
 */
function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
    this._recognized = false;
}

inherit(PressRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PressRecognizer
     */
    defaults: {
        event: 'press',
        pointers: 1,
        time: 251, // minimal time of the pointer to be pressed
        threshold: 9 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_AUTO];
    },

    process: function(input) {
        var options = this.options;
        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;

        this._input = input;

        if (!validMovement || !validPointers || (input.eventType & INPUT_CANCEL) ||
            (input.eventType & INPUT_END && !this._recognized)) {
            this.reset();
        } else if (input.eventType & INPUT_START) {
            this.reset();
            if (options.time <= 0) {
                return STATE_RECOGNIZED;
            }
            this._timer = setTimeoutContext(function() {
                if (!isRecognizerActive(this)) {
                    this.reset();
                    return;
                }
                this.state = STATE_RECOGNIZED;
                this.tryEmit();
            }, options.time, this);
        } else if (input.eventType & INPUT_END) {
            this.reset();
            return STATE_RECOGNIZED;
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
        this._recognized = false;
    },

    emit: function(input) {
        if (this.state !== STATE_RECOGNIZED) {
            return;
        }

        if (input && (input.eventType & INPUT_END)) {
            this.manager.emit(this.options.event + 'up', input);
        } else {
            this._recognized = true;
            this._input.timeStamp = now();
            this.manager.emit(this.options.event, this._input);
        }
    }
});
