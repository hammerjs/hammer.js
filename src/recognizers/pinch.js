function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            Math.abs(1 - input.scale) > this.options.threshold;
    },

    emit: function(input) {
        this._super.emit.call(this, input);

        var inOut = input.scale < 1 ? 'in' : 'out';
        this.manager.emit(this.options.event + inOut + statePostfix(this.state), input);
    }
});
