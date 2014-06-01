function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this._pX = null;
    this._pY = null;
}

inherit(PanRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL
    },

    attrTest: function(input) {
        var options = this.options;
        var isNew = true;

        // lock to axis
        if(!(input.direction & options.direction)) {
            var x = input.deltaX;
            var y = input.deltaY;

            if(options.direction & DIRECTION_HORIZONTAL) {
                input.direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                isNew = x != this._pX;
            } else {
                input.direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                isNew = y != this._pY;
            }
        }

        return this._super.attrTest.call(this, input) &&
            input.direction & options.direction && isNew &&
            (input.distance > options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        this._pX = input.deltaX;
        this._pY = input.deltaY;

        this._super.emit.call(this, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});
