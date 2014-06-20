function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        movementBetween: 10, // a multi-tap can be a bit off the initial position
        movementWhile: 2 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.movementWhile;
        var validTouchTime = input.deltaTime < options.time;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if(input.eventType & INPUT_END && validMovement && validTouchTime && validPointers) {
            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.movementBetween;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if(!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            // if tap count matches we have recognized it,
            // else it has began recognizing...
            var validTapCount = (this.count % options.taps === 0);
            if(validTapCount) {
                return STATE_RECOGNIZED;
            }
            return STATE_BEGAN;
        }
        return STATE_FAILED;
    },

    emit: function(input) {
        if(this.state & STATE_RECOGNIZED) {
            input.tapCount = this.count;
            this.manager.emit(this.options.event, input);
        }
    }
});
