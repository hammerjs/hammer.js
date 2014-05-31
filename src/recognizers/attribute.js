/**
 * this recognizer is just used as a base for the simple
 * pan, pinch, rotate and swipe recognizers
 * @constructor
 */
function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    defaults: {
        pointers: 1
    },

    /**
     * used to check if it the recognizer receives valid input, like input.distance > 10
     * this should be overwritten
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        return input.pointers.length === this.options.pointers;
    },

    test: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED);
        var isValid = this.attrTest(input);

        // on cancel input and we've never recognized before we just return STATE_CANCELLED
        if(isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;

        // valid properties!
        } else if(isRecognized || isValid) {
            if(eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if(!(state & STATE_BEGAN)) {
                return state | STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }

        // maybe the next cycle
        return STATE_FAILED;
    }
});
