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

    attrTest: function(input) {
        return input.velocity > this.options.velocity &&
            input.distance > this.options.distance &&
            input.eventType & INPUT_END;
    },

    emit: function(input) {
        this.manager.emit(this.options.event, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});
