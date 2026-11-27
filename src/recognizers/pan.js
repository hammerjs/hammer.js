/**
 * Pan
 * Recognized when the pointer is down and moved in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PanRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PanRecognizer
     */
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_ALL
    },

    getTouchAction: function() {
        var direction = this.options.direction;
        var actions = [];
        if (direction & DIRECTION_HORIZONTAL) {
            actions.push(TOUCH_ACTION_PAN_Y);
        }
        if (direction & DIRECTION_VERTICAL) {
            actions.push(TOUCH_ACTION_PAN_X);
        }
        return actions;
    },

    directionTest: function(input) {
        var options = this.options;
        var optDirection = options.direction;
        if (!(optDirection & DIRECTION_ALL)) {
            return false;
        }
        var distance = input.distance;
        var direction = input.direction;
        var x = input.deltaX;
        var y = input.deltaY;
        var isHorizontal = !!(optDirection & DIRECTION_HORIZONTAL);
        var isVertical = !!(optDirection & DIRECTION_VERTICAL);

        // lock to axis?
        if (isHorizontal && !isVertical) {
            distance = abs(x);
            if (!(direction & optDirection)) {
                direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
            }
        } else if (isVertical && !isHorizontal) {
            distance = abs(y);
            if (!(direction & optDirection)) {
                direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
            }
        } else if (!(direction & optDirection)) {
            direction = getDirection(x, y);
        }

        input.direction = direction;
        return distance > options.threshold && direction & optDirection;
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (this.state & STATE_BEGAN || this.directionTest(input));
    },

    emit: function(input) {
        var direction = directionStr(input.direction);

        if (direction) {
            input.additionalEvent = this.options.event + direction;
        }
        this._super.emit.call(this, input);
    }
});
