function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    defaults: {
        event: 'swipe',
        distance: 10,
        velocity: 0.6,
        pointers: 1
    },

    validTest: function(input) {
        return input.velocity > this.options.velocity &&
            input.distance > this.options.distance &&
            input.eventType == INPUT_END;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event, input);
        this.inst.trigger(this.options.event + input.direction, input);
    }
});
