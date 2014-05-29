function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    defaults: {
        event: 'attr',
        pointers: 1
    },

    failTest: function(input) {
        return input.pointers.length > this.options.pointers;
    },

    validTest: function(/*input*/) {
        return true;
    },

    test: function(input) {
        var options = this.options;
        var state = this.state;
        var eventType = input.eventType;

        var pointersLength = input.pointers.length;
        var isRecognized = state <= STATE_RECOGNIZED;

        var validPointers = pointersLength === options.pointers;
        var validAttribute = this.validTest(input);

        if(state <= STATE_RECOGNIZED && eventType === INPUT_CANCEL) {
            return STATE_CANCELLED;
        } else if(this.failTest(input)) {
            return STATE_FAILED;
        } else if(validPointers && (isRecognized || validAttribute)) {
            if(state === STATE_POSSIBLE && eventType !== INPUT_END) {
                return STATE_BEGAN;
            }else if(eventType === INPUT_END) {
                return STATE_RECOGNIZED;
            }
            return STATE_CHANGED;
        } else if(!validPointers || !validAttribute) {
            return isRecognized ? STATE_ENDED : STATE_POSSIBLE;
        }
        return STATE_POSSIBLE;
    }
});
