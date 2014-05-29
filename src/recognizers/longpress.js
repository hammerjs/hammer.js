function LongPressRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.timer = null;
}

// @todo implement this gesture

inherit(LongPressRecognizer, AttrRecognizer, {
    defaults: {
        event: 'longpress',
        duration: 500,
        movement: 10,
        pointers: 1
    },

    failTest: function(input) {
        return input.distance > this.options.distance;
    },

    validTest: function(/*input*/) {
        return false;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event, input);
    }
});
