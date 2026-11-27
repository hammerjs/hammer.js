var SINGLE_TOUCH_INPUT_MAP = assign(Object.create(null), {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
});

var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 * @extends Input
 */
function SingleTouchInput() {
    this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
    this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
    this.started = false;
    this._lastEv = null;

    Input.apply(this, arguments);
}

inherit(SingleTouchInput, Input, {
    handler: function TEhandler(ev) {
        if (!isAllowedPointerType(this.manager, INPUT_TYPE_TOUCH)) {
            return;
        }
        var type = SINGLE_TOUCH_INPUT_MAP[ev.type];
        if (!type) {
            return;
        }

        // Dedupe a touchstart that fired on evTarget and then bubbled to evWin
        if (type === INPUT_START) {
            if (ev === this._lastEv) {
                return;
            }
            this._lastEv = ev;
        } else {
            this._lastEv = null;
        }

        var isTargetStart = type === INPUT_START && (!ev.currentTarget || ev.currentTarget === this.target);
        if (!this.started && !isTargetStart) {
            return;
        }

        var isEndOrCancel = type & (INPUT_END | INPUT_CANCEL);
        var touches = normalizeSingleTouches.call(this, ev, type);
        if (!touches[0].length || (isEndOrCancel && !touches[1].length)) {
            if (isEndOrCancel && !touches[0].length) {
                this.started = false;
            }
            return;
        }

        if (isTargetStart) {
            this.started = true;
        }

        // when done, reset the started state
        if (isEndOrCancel && touches[0].length - touches[1].length === 0) {
            this.started = false;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    },

    reset: function() {
        this.started = false;
    },

    destroy: function() {
        this._lastEv = null;
        this._super.destroy.call(this);
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function normalizeSingleTouches(ev, type) {
    var all = toArray(ev.touches);
    var changed = toArray(ev.changedTouches);

    if (type & (INPUT_END | INPUT_CANCEL)) {
        all = uniqueArray(all.concat(changed), 'identifier', true);
    }

    return [all, changed];
}
