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
 * @extends Input
 */
function TouchInput() {
    this.evEl = TOUCH_EVENTS;
    this.targetIds = {};

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    /**
     * handle touch events
     * @param {Object} ev
     */
    handler: function(ev) {
        var touches = normalizeTouches(ev, this);
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
 * @param {TouchInput} touchInput
 * @returns {Array} [all, changed]
 */
function normalizeTouches(ev, touchInput) {
    var i, len;

    var targetIds = touchInput.targetIds;
    var targetTouches = toArray(ev.targetTouches);
    var changedTouches = toArray(ev.changedTouches);
    var changedTargetTouches = [];

    // collect touches
    if (ev.type == 'touchstart') {
        for (i = 0, len = targetTouches.length; i < len; i++) {
            targetIds[targetTouches[i].identifier] = true;
        }
    }

    // filter changed touches to only contain touches that exist in the collected target ids
    for (i = 0, len = changedTouches.length; i < len; i++) {
        if (targetIds[changedTouches[i].identifier]) {
            changedTargetTouches.push(changedTouches[i]);
        }

        // cleanup removed touches
        if (ev.type == 'touchend'|| ev.type == 'touchcancel') {
            delete targetIds[changedTouches[i].identifier];
        }
    }

    return [
        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
        // also removed the duplicates
        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier'),

        // only the changed :-)
        changedTargetTouches
    ];
}
