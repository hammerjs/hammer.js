function HoldRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(HoldRecognizer, Recognizer, {
    defaults: {
        event: 'hold',
        pointers: 1,
        taps: 1,
        time: 500, // minimal time of the pointer to be down (like finger on the screen)
        movementWhile: 5 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.movementWhile;
        var validTouchTime = input.deltaTime > options.time;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if(input.eventType & INPUT_END && validMovement && validTouchTime && validPointers) {
            return STATE_RECOGNIZED;
        }

        // maybe next round
        return STATE_FAILED;
    },

    emit: function(input) {
        this.manager.emit(this.options.event, input);
    }
});
