function RotationRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotationRecognizer, AttrRecognizer, {
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(1 - input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    }
});
