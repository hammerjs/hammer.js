function LongPressRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.timer = null;
}

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
        return STATE_FAILED;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event, input);
    }
});
