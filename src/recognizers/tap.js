function TapRecognizer() {
    Recognizer.apply(this, arguments);

    this._pTime = false;
    this._pCenter = false;

    this._count = 0;
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
            var validInterval = this._pTime ? (input.timeStamp - this._pTime < options.interval) : true;
            var validTapTime = input.deltaTime < options.time;
            var validMultiTap = !this._pCenter || getDistance(this._pCenter, input.center) < options.movementBetweenTaps;

            this._pTime = input.timeStamp;
            this._pCenter = input.center;

            if(!validPointers || !validTapTime) {
                this._count = 0;
                return STATE_FAILED;
            }

            if(!validMultiTap || !validInterval) {
                this._count = 1;
            } else {
                this._count += 1;
            }

            var validTapCount = (this._count % options.taps === 0);
            if(validTapCount && validTapTime && validPointers) {
                return STATE_RECOGNIZED;
            }
        }
        return STATE_FAILED;
    },

    handler: function(input) {
        input.tapCount = this._count;
        this.inst.trigger(this.options.event, input);
    },

    reset: function() {
        return Recognizer.prototype.reset.apply(this, arguments);
    }
});
