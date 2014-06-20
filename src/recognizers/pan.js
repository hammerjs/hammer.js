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

    directionTest: function(input) {
        var options = this.options;
        var hasMoved = true;
        var distance = input.distance;

        // lock to axis
        if(!(input.direction & options.direction)) {
            var x = input.deltaX;
            var y = input.deltaY;

            if(options.direction & DIRECTION_HORIZONTAL) {
                input.direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                hasMoved = x != this._pX;
                distance = Math.abs(input.deltaX);
            } else {
                input.direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                hasMoved = y != this._pY;
                distance = Math.abs(input.deltaY);
            }
        }
        return hasMoved && distance > options.threshold && input.direction & options.direction;
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input) &&
            this.state & STATE_BEGAN || (
                !(this.state & STATE_BEGAN) && this.directionTest(input)
            );
    },

    emit: function(input) {
        this._pX = input.deltaX;
        this._pY = input.deltaY;

        this._super.emit.call(this, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});
