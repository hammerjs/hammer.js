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
        movementBetween: 10, // a multi-tap can be a bit off the initial position
        movementDuring: 2 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;
        var eventType = input.eventType;
        var state = this.state;

        // we only allow little movement
        if(eventType & INPUT_MOVE && input.distance > options.movementDuring || input.pointers.length > options.pointers) {
            return STATE_FAILED;

        // until we've reached an end event, it is never possible
        } else if(!(eventType & INPUT_END)) {
            return STATE_FAILED;

        // we've reached an end touch
        } else if(eventType & INPUT_END) {
            var validPointers = input.pointers.length === options.pointers;
            var validInterval = this._pTime ? (input.timeStamp - this._pTime < options.interval) : true;
            var validTapTime = input.deltaTime < options.time;
            var validMultiTap = !this._pCenter || getDistance(this._pCenter, input.center) < options.movementBetween;

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
                return state | STATE_RECOGNIZED;
            }
        }

        // maybe next round
        return STATE_POSSIBLE;
    },

    emit: function(input) {
        input.tapCount = this._count;
        this.manager.emit(this.options.event, input);
    }
});
