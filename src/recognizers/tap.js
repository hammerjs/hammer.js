function TapRecognizer() {
    Recognizer.apply(this, arguments);

    this.prevTime = false;
    this.prevCenter = false;

    this.counter = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        movementBetweenTaps: 10, // a multi-tap can be a bit off the initial position
        movementDuringTap: 2 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;
        var eventType = input.eventType;

        if(eventType === INPUT_MOVE && input.distance > options.movementDuringTap || input.pointers.length > options.pointers) {
            return STATE_FAILED;
        }  else if(eventType !== INPUT_END) {
            return STATE_POSSIBLE;
        } else {
            var validPointers = input.pointers.length === options.pointers;
            var validInterval = this.prevTime ? (input.timeStamp - this.prevTime < options.interval) : true;
            var validTapTime = input.deltaTime < options.time;
            var validMultiTap = !this.prevCenter || getDistance(this.prevCenter, input.center) < options.movementBetweenTaps;

            this.prevTime = input.timeStamp;
            this.prevCenter = input.center;

            if(!validPointers || !validTapTime) {
                this.counter = 0;
                return STATE_FAILED;
            }

            if(!validMultiTap || !validInterval) {
                this.counter = 1;
            } else {
                this.counter += 1;
            }

            var validTapCount = (this.counter % options.taps === 0);
            if(validTapCount && validTapTime && validPointers) {
                return STATE_RECOGNIZED;
            }
        }
        return STATE_FAILED;
    },

    handler: function(input) {
        input.tapCount = this.counter;
        this.inst.trigger(this.options.event, input);
    },

    reset: function() {
        return Recognizer.prototype.reset.apply(this, arguments);
    }
});
