function RotationRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotationRecognizer, AttrRecognizer, {
    defaults: {
        event: 'rotate',
        threshold: 5,
        pointers: 2
    },

    validTest: function(input) {
        return Math.abs(1 - input.rotation) > this.options.threshold;
    }
});
