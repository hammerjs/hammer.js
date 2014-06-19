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
     * @virtual
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        var optionPointers = this.options.pointers;
        return optionPointers === 0 || input.pointers.length === optionPointers;
    },

    test: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        var isValid = this.attrTest(input);

        // on cancel input and we've recognized before, return STATE_CANCELLED
        if(isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;
        } else if(isRecognized || isValid) {
            if(eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if(!(state & STATE_BEGAN)) {
                return state | STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }
        return STATE_FAILED;
    }
});
