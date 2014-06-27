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
    //if (ev.targetTouches && ev.targetTouches.length !== ev.touches.length) {
    //    return normalizeTargetTouches(ev);
    //}

    var changedTouches = toArray(ev.changedTouches);
    var touches = toArray(ev.touches).concat(changedTouches);

    return [
        // should contain all the touches, touches + changedTouches
        uniqueArray(touches, 'identifier'),
        // should contain only the touches that have changed
        changedTouches
    ];
}

/**
 * when multi-user we want some more logic..
 * @param {Object} ev
 * @returns {Array} [all, changed]
 */
/*
function normalizeTargetTouches(ev) {
    var targetTouches = toArray(ev.targetTouches);
    var changedTouches = ev.changedTouches;
    var targetChangedTouches = [];
    var i, len;

    // collect all target ids
    var targetIds = {};
    for (i = 0, len = targetTouches.length; i < len; i++) {
        targetIds[targetTouches[i].identifier] = true;
    }

    // only the changed touches on the target
    for (i = 0, len = changedTouches.length; i < len; i++) {
        if (targetIds[changedTouches[i].identifier]) {
            targetChangedTouches.push(changedTouches[i]);
        }
    }

    return [
        // should contain all the touches, touches + changedTouches
        // and filter out duplicate items
        uniqueArray(targetTouches.concat(targetChangedTouches), 'identifier'),
        // should contain only the touches that have changed
        targetChangedTouches
    ];
}
*/
