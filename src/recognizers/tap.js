function TapRecognizer(/* inst, options */) {
    Recognizer.apply(this, arguments);

    this.prevTime = false;
    this.prevCenter = false;

    this.tapCount = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        interval: 500,
        tapTime: 200,
        pointers: 1,
        taps: 1,
        movementBetweenTaps: 10,
        movementDuringTap: 3
    },

    test: function(input) {
        var options = this.options;
        var eventType = input.eventType;

        if(eventType === EVENT_MOVE && input.distance > options.movementDuringTap) {
             return STATE_FAILED;
        }  else if(eventType !== EVENT_END) {
            return STATE_POSSIBLE;
        } else {
            var validPointers = input.pointers.length === options.pointers;
            var validInterval = this.prevTime ? (input.timeStamp - this.prevTime < options.interval) : true;
            var validTapTime = input.deltaTime < options.tapTime;
            var validMovement = !this.prevCenter || getDistance(this.prevCenter, input.center) < options.movementBetweenTaps;

            this.tapCount = (!validPointers || !validInterval || !validTapTime || !validMovement) ? 0 : this.tapCount += 1;

            var validTapCount = (this.tapCount !== 0 || options.taps === 1) && this.tapCount % options.taps === 0;

            this.prevTime = input.timeStamp;
            this.prevCenter = input.center;

            if(validTapCount) {
                return STATE_RECOGNIZED;
            }
        }
        return STATE_FAILED;
    },

    handler: function(input) {
        input.tapCount = this.tapCount;
        this.inst.trigger(this.options.event, input);
    }
});
