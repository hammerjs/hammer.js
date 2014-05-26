function TransformRecognizer(/* inst, options */) {
    Recognizer.apply(this, arguments);
}

inherit(TransformRecognizer, Recognizer, {
    defaults: {
        event: 'transform',
        minRotation: .1,
        minScale: .1,
        minPointers: 2,
        maxPointers: Infinity
    },

    test: function(input) {
        var options = this.inst.options;
        var state = this.state;
        var eventType = input.eventType;

        var pointersInRange = inRange(input.pointers.length, options.minPointers, options.maxPointers);
        var isStarted = state <= STATE_RECOGNIZED;
        var validRotation = Math.abs(1 - input.rotation) > options.minRotation;
        var validScale = Math.abs(1 - input.scale) > options.minScale;

        if(state <= STATE_RECOGNIZED && eventType === EVENT_CANCEL) {
            return STATE_CANCELLED;
        } else if(pointersInRange && (isStarted || validRotation || validScale) && eventType < EVENT_END) {
            return (state === STATE_POSSIBLE) ? STATE_BEGAN : STATE_CHANGED;
        } else if(!pointersInRange || !validRotation || !validScale || eventType === EVENT_END) {
            return isStarted ? STATE_ENDED : STATE_POSSIBLE;
        }
        return STATE_POSSIBLE;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event + this.statePostfix(), input);
    }
});
