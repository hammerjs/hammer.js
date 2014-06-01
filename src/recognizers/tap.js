function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
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
            var validInterval = this._pTime ? (input.timeStamp - this._pTime < options.interval) : true;
            var validMultiTap = !this._pCenter || getDistance(this._pCenter, input.center) < options.movementBetween;

            this._pTime = input.timeStamp;
            this._pCenter = input.center;

            if(!validMultiTap || !validInterval) {
                this._count = 1;
            } else {
                this._count += 1;
            }

            var validTapCount = (this._count % options.taps === 0);
            if(validTapCount) {
                return STATE_RECOGNIZED;
            }
        }

        // maybe next round
        return STATE_FAILED;
    },

    emit: function(input) {
        input.tapCount = this._count;
        this.manager.emit(this.options.event, input);
    }
});
