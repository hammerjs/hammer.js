function PanRecognizer(/* inst, options */) {
    AttrRecognizer.apply(this, arguments);
}

inherit(PanRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1
    },

    validTest: function(input) {
        return input.distance > this.options.threshold;
    },

    handler: function(input) {
        this.inst.trigger(this.options.event + this.statePostfix(), input);
        this.inst.trigger(this.options.event + input.direction + this.statePostfix(), input);
    }
});
