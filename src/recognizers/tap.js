function TapRecognizer() {
    Recognizer.apply(this, arguments);

    this.prevTime = false;
    this.prevCenter = false;

    this.counter = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        interval: 500,
        time: 200,
        pointers: 1,
        taps: 1,
        movementBetweenTaps: 10,
        movementDuringTap: 2
    },

    test: function(input) {
        var options = this.options;
        var eventType = input.eventType;

        if(eventType === EVENT_MOVE && input.distance > options.movementDuringTap || input.pointers.length > options.pointers) {
             return STATE_FAILED;
        }  else if(eventType !== EVENT_END) {
            return STATE_POSSIBLE;
        } else {
            var validPointers = input.pointers.length === options.pointers;
            var validInterval = this.prevTime ? (input.timeStamp - this.prevTime < options.interval) : true;
            var validTapTime = input.deltaTime < options.time;
            var validMovement = !this.prevCenter || getDistance(this.prevCenter, input.center) < options.movementBetweenTaps;

            this.prevTime = input.timeStamp;
            this.prevCenter = input.center;

            if(!validPointers || !validTapTime || !validMovement) {
                this.counter = 0;
                return STATE_FAILED;
            }

            if(validInterval) {
                this.counter += 1;
            } else {
                this.counter = 1;
            }

            var validTapCount = (this.counter % options.taps === 0);

            if(validTapCount && validTapTime && validPointers && validMovement) {
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
