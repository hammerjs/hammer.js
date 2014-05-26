function PanRecognizer(/* inst, options */) {
    Recognizer.apply(this, arguments);
}

inherit(PanRecognizer, Recognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1
    },

    test: function(input) {
        var options = this.options;
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state <= STATE_RECOGNIZED;
        var validPoints = input.pointers.length === options.pointers;
        var validDistance = input.distance > options.threshold;

        if(isRecognized && eventType === EVENT_CANCEL) {
            return STATE_CANCELLED;
        } else if(validPoints && (isRecognized || validDistance) && eventType < EVENT_END) {
            return (state === STATE_POSSIBLE) ? STATE_BEGAN : STATE_CHANGED;
        } else if(!validPoints || !validDistance || eventType === EVENT_END) {
            return isRecognized ? STATE_ENDED : STATE_POSSIBLE;
        }
        return STATE_POSSIBLE;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event + this.statePostfix(), input);
    }
});
