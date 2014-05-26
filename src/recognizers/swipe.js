function SwipeRecognizer(/* inst, options */) {
    Recognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, Recognizer, {
    defaults: {
        event: 'swipe',
        minVelocity: .6,
        minDistance: 10,
        minPointers: 1,
        maxPointers: Infinity
    },

    test: function(input) {
        var options = this.inst.options;
        var state = this.state;
        var eventType = input.eventType;

        var pointersInRange = inRange(input.pointers.length, options.minPointers, options.maxPointers);
        var validVelocity = input.velocity > options.minVelocity;
        var validDistance = input.distance > options.minDistance;

        if(state <= STATE_RECOGNIZED && eventType === EVENT_CANCEL) {
            return STATE_CANCELLED;
        } else if(pointersInRange && validDistance && validVelocity && eventType === EVENT_END) {
            return STATE_RECOGNIZED;
        } else if(!pointersInRange || !validDistance || !validVelocity || eventType !== EVENT_END) {
            return STATE_POSSIBLE;
        }
        return STATE_POSSIBLE;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event + this.statePostfix(), input);
    }
});
