function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pinch',
        threshold: 0.2,
        pointers: 2
    },

    validTest: function(input) {
        return Math.abs(1 - input.scale) > this.options.threshold;
    },

    handler: function(input) {
        var inOut = input.scale < 1 ? 'in' : 'out';
        this.inst.trigger(this.options.event + statePostfix(this.state), input);
        this.inst.trigger(this.options.event + inOut + statePostfix(this.state), input);
    }
});
