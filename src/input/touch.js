var TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var TOUCH_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 */
function TouchInput() {
    this.elEvents = TOUCH_EVENTS;

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    /**
     * handle touch events
     * @param {Object} ev
     */
    handler: function(ev) {
        var touches = normalizeTouches(ev);
        this.callback(this.manager, TOUCH_INPUT_MAP[ev.type], {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * make sure all browsers return the same touches
 * @param {Object} ev
 * @returns {Array} [all, changed]
 */
function normalizeTouches(ev) {
    var changedTouches = toArray(ev.changedTouches);
    var touches = toArray(ev.touches).concat(changedTouches);

    return [
        // should contain all the touches, touches + changedTouches
        uniqueArray(touches, 'identifier'),
        // should contain only the touches that have changed
        changedTouches
    ];
}
