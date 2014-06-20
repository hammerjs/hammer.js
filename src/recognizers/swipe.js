function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    defaults: {
        event: 'swipe',
        threshold: 10,
        velocity: 0.65,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
        pointers: 1
    },

    attrTest: function(input) {
        var direction = this.options.direction;
        var velocity;

        if(direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
            velocity = input.velocity;
        } else if(direction & DIRECTION_HORIZONTAL) {
            velocity = input.velocityX;
        } else if(direction & DIRECTION_VERTICAL) {
            velocity = input.velocityY;
        }

        return !!(PanRecognizer.prototype.directionTest.call(this, input) &&
            velocity > this.options.velocity &&
            input.eventType & INPUT_END);
    },

    emit: function(input) {
        this.manager.emit(this.options.event, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});
