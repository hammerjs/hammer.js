function LongPressRecognizer(/* inst, options */) {
    Recognizer.apply(this, arguments);
}

inherit(LongPressRecognizer, Recognizer, {
    defaults: {
        event: 'longpress',
        time: 500
    },

    test: function(input) {

        return STATE_FAILED;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event, input);
    }
});
