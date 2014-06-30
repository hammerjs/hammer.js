/**
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 */
function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(PressRecognizer, Recognizer, {
    defaults: {
        event: 'press',
        pointers: 1,
        time: 500, // minimal time of the pointer to be pressed
        threshold: 5 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_AUTO];
    },

    process: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
            return STATE_FAILED;
        } else if (input.eventType & INPUT_START) {
            this.reset();
            var self = this;
            this._timer = setTimeout(function() {
                self.state = STATE_RECOGNIZED;
                self.tryEmit();
            }, options.time);
        }
        return STATE_BEGAN;
    },

    reset: function() {
        clearTimeout(this._timer);
        this._timer = null;
    },

    emit: function() {

        if (this.state == STATE_RECOGNIZED ) {
            this._input.timeStamp = Date.now();
            this.manager.emit(this.options.event, this._input);
        }
    }
});
