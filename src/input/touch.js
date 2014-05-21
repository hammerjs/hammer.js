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
    this._events = 'touchstart touchmove touchend touchcancel';

    addEvent(this.inst.element, this._events, this._handler);
};

Input.Touch.prototype = {
    /**
     * handle touch events
     * @param ev
     */
    handler: function(ev) {
        var touches = this.normalizeTouches(ev);
        var data = {
            pointers: touches.all,
            changedPointers: touches.changed,
            pointerType: 'touch',
            _event: ev
        };

        this.callback(this.inst, ev.type.replace('touch',''), data);
    },

    /**
     * make sure all browsers return the same touches
     * @param ev
     * @returns {{all: *, changed: *}}
     */
    normalizeTouches: function(ev) {
        return {
            // should contain all the touches, touches + changedTouches
            all: ev.touches,
            // should contain only the touches that have changed
            changed: ev.changedTouches
        };
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        removeEvent(this.inst.element, this._events, this._handler);
    }
};
