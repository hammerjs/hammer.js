function PanRecognizer(/* inst, options */) {
    AttrRecognizer.apply(this, arguments);
}

inherit(PanRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1
    },

    testAttr: function(input) {
        return input.distance > this.options.threshold;
    }
});
