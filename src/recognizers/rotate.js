/**
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
function RotateRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof RotateRecognizer
     */
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    },

    respondsToEvent: function(event) {
        if (typeof event === 'object' && event.hasOwnProperty('type')) {
            event = event.type;
        }

        if (typeof event === 'string') {
            return event === this.options.type ||
                   event === (this.options.type + stateStr(STATE_BEGAN)) ||
                   event === (this.options.type + stateStr(STATE_CHANGED)) ||
                   event === (this.options.type + stateStr(STATE_ENDED)) ||
                   event === (this.options.type + stateStr(STATE_CANCELLED));
        } else {
            return false;
        }
    }
});
