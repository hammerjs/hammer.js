function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PanRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            input.distance > this.options.threshold;
    },

    emit: function(input) {
        this._super.emit.call(this, input);
        this.manager.emit(this.options.event + input.direction + statePostfix(this.state), input);
    }
});
