/**
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */
function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        this._super.emit.call(this, input);
        if (input.scale !== 1) {
            var inOut = input.scale < 1 ? 'in' : 'out';
            this.manager.emit(this.options.event + inOut, input);
        }
    },

    respondsToEvent: function(event) {
        if (typeof event === 'object' && event.hasOwnProperty('type')) {
            event = event.type;
        }

        if (typeof event === 'string') {
            return event === this.options.type ||
                   event === (this.options.type + 'out') ||
                   event === (this.options.type + 'in') ||
                   event === (this.options.type + stateStr(STATE_BEGAN)) ||
                   event === (this.options.type + stateStr(STATE_CHANGED)) ||
                   event === (this.options.type + stateStr(STATE_ENDED)) ||
                   event === (this.options.type + stateStr(STATE_CANCELLED));
        } else {
            return false;
        }
    }
});
