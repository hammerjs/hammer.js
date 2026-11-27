/**
 * Swipe
 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof SwipeRecognizer
     */
    defaults: {
        event: 'swipe',
        threshold: 30,
        velocity: 0.3,
        maxVelocity: 80,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
        pointers: 1
    },

    getTouchAction: function() {
        return PanRecognizer.prototype.getTouchAction.call(this);
    },

    attrTest: function(input) {
        var direction = this.options.direction;
        var offsetDirection = input.offsetDirection;
        var maxVelocity = this.options.maxVelocity;
        var velocity;

        if (offsetDirection === DIRECTION_LEFT) {
            velocity = -input.velocityX;
        } else if (offsetDirection === DIRECTION_RIGHT) {
            velocity = input.velocityX;
        } else if (offsetDirection === DIRECTION_UP) {
            velocity = -input.velocityY;
        } else if (offsetDirection === DIRECTION_DOWN) {
            velocity = input.velocityY;
        } else {
            velocity = 0;
        }

        return this._super.attrTest.call(this, input) &&
            direction & offsetDirection &&
            input.distance > this.options.threshold &&
            input.maxPointers == this.options.pointers &&
            velocity > this.options.velocity &&
            (!(maxVelocity > 0) || velocity <= maxVelocity) &&
            input.eventType & INPUT_END;
    },

    process: function(input) {
        return this.attrTest(input) ? STATE_RECOGNIZED : STATE_FAILED;
    },

    emit: function(input) {
        var manager = this.manager;
        if (!manager || manager.session.stopped === FORCED_STOP) {
            return;
        }
        var direction = directionStr(input.offsetDirection);
        if (direction) {
            manager.emit(this.options.event + direction, input);
        }

        if (this.manager && manager.session.stopped !== FORCED_STOP) {
            manager.emit(this.options.event, input);
        }
    }
});
