function LongPressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(LongPressRecognizer, Recognizer, {
    defaults: {
        event: 'longpress',
        pointers: 1,
        time: 500, // max time of the pointer to be down (like finger on the screen)
        movement: 10 // a minimal movement is ok, but keep it low
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    test: function(input) {
        var options = this.options;
        var eventType = input.eventType;

        this._input = input;

        // too many pointers or some movement
        if(eventType === INPUT_MOVE && input.distance > options.movement || input.pointers.length > options.pointers) {
            this.reset();
            return STATE_FAILED;
        }

        // start timing
        if(input.isFirst) {
            this.reset();
            //this._timer = setTimeout(bindFn(this.handler, this), options.time);
            return STATE_POSSIBLE;
        }

        if(eventType < INPUT_END) {
            return STATE_POSSIBLE;
        }

        if(eventType === INPUT_END) {
            var validPointers = input.pointers.length === options.pointers;
            var validTime = input.deltaTime > options.time;

            if(!validPointers || !validTime) {
                return STATE_FAILED;
            } else {
                return STATE_RECOGNIZED;
            }
        }
        return STATE_FAILED;
    },

    emit: function(input) {
        this.manager.emit(this.options.event, input || this._input);
    }
});
