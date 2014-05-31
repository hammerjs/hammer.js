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
    attrTest: function(/*input*/) {
        return true;
    },

    /**
     * used to check if it the recognizer should return a fail state
     * this could be overwritten
     * @param {Object} input
     * @returns {Boolean} failed
     */
    failTest: function(input) {
        return input.pointers.length > this.options.pointers;
    },

    test: function(input) {
        var options = this.options;
        var state = this.state;
        var eventType = input.eventType;

        var pointersLength = input.pointers.length;
        var isRecognized = state & STATE_RECOGNIZED;

        var validPointers = pointersLength === options.pointers;
        var validAttrTest = this.attrTest(input);

        // on cancel input and we've never recognized before we just return STATE_CANCEL
        if(isRecognized && eventType & INPUT_CANCEL) {
            return state | STATE_CANCELLED;

        // it is a failure (like too many pointers)
        } else if(!isRecognized && this.failTest(input)) {
            return STATE_FAILED;

        // valid properties!
        } else if(validPointers && (isRecognized || validAttrTest)) {
            if(eventType & INPUT_END) {
                return state | STATE_ENDED;

            } else if(!(state & STATE_BEGAN)) {
                return state | STATE_BEGAN;
            }
            return state | STATE_CHANGED;

        // we've recognized it before, but it became invalid
        } else if(isRecognized && (!validPointers || !validAttrTest)) {
            return state | STATE_ENDED;
        }

        // maybe the next cycle
        return STATE_POSSIBLE;
    }
});
