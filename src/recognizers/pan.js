var PAN_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var PAN_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;

function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

PanRecognizer.HORIZONTAL = PAN_HORIZONTAL;
PanRecognizer.VERTICAL = PAN_VERTICAL;

inherit(PanRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: PAN_HORIZONTAL | PAN_VERTICAL
    },

    attrTest: function(input) {
        // @todo lock to the direction
        return this._super.attrTest.call(this, input) &&
            input.direction & this.options.direction &&
            input.distance > this.options.threshold;
    },

    emit: function(input) {
        this._super.emit.call(this, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});
