var INPUT_TOUCH_TYPE_MAP = {
    'touchstart': INPUT_EVENT_START,
    'touchmove': INPUT_EVENT_MOVE,
    'touchend': INPUT_EVENT_END,
    'touchcancel': INPUT_EVENT_END
};

var INPUT_TOUCH_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @param inst
 * @param callback
 * @constructor
 */
Input.Touch = function(inst, callback) {
    this.inst = inst;
    this.callback = callback;

    this._handler = bindFn(this.handler, this);
    addEvent(this.inst.element, INPUT_TOUCH_EVENTS, this._handler);
};

Input.Touch.prototype = {
    /**
     * handle touch events
     * @param ev
     */
    handler: function(ev) {
        var touches = this.normalizeTouches(ev);
        var data = {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            _event: ev
        };

        this.callback(this.inst, INPUT_TOUCH_TYPE_MAP[ev.type], data);
    },

    /**
     * make sure all browsers return the same touches
     * @param ev
     * @returns [all, changed]
     */
    normalizeTouches: function(ev) {
        var changedTouches = toArray(ev.changedTouches);
        var touches = toArray(ev.touches).concat(changedTouches);

        return [
            // should contain all the touches, touches + changedTouches
            uniqueArray(touches, 'identifier'),
            // should contain only the touches that have changed
            changedTouches
        ];
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        removeEvent(this.inst.element, INPUT_TOUCH_EVENTS, this._handler);
    }
};
