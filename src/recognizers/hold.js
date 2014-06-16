function HoldRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(HoldRecognizer, Recognizer, {
    defaults: {
        event: 'hold',
        pointers: 1,
        time: 500, // minimal time of the pointer to be down (like finger on the screen)
        threshold: 10 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if(!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
        } else if(input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeout(bindFn(this.emit, this), options.time);
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        this.manager.emit(this.options.event, this._input);
    }
});
