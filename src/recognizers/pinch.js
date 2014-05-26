function PinchRecognizer(/* inst, options */) {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pinch',
        threshold: .2,
        pointers: 2
    },

    testAttr: function(input) {
        return Math.abs(1 - input.scale) > this.options.threshold;
    }
});


