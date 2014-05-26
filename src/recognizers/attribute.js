function AttrRecognizer(/* inst, options */) {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    defaults: {
        event: 'attr',
        pointers: 1
    },

    test: function(input) {
        var options = this.options;
        var state = this.state;
        var eventType = input.eventType;

        var pointersLength = input.pointers.length;
        var isRecognized = state <= STATE_RECOGNIZED;

        var validPointers = pointersLength === options.pointers;
        var validAttribute = this.testAttr(input);

        if(state <= STATE_RECOGNIZED && eventType === EVENT_CANCEL) {
            return STATE_CANCELLED;
        } else if(pointersLength > options.pointers) {
            return STATE_FAILED;
        } else if(validPointers && (isRecognized || validAttribute) && eventType < EVENT_END) {
            return (state === STATE_POSSIBLE) ? STATE_BEGAN : STATE_CHANGED;
        } else if(!validPointers || !validAttribute || eventType === EVENT_END) {
            return isRecognized ? STATE_ENDED : STATE_POSSIBLE;
        }
        return STATE_POSSIBLE;
    }
});
