/**
 * Mouse events input
 * @param inst
 * @param callback
 * @constructor
 */
Input.Mouse = function(inst, callback) {
    this.inst = inst;
    this.callback = callback;

    this._handler = bindFn(this.handler, this);
    this._events = 'mousedown mousemove mouseup';
    addEvent(this.inst.element, this._events, this._handler);
    addEvent(window, 'mouseout', this._handler);

    this._pressed = false;
};

Input.Mouse.prototype = {
    /**
     * handle mouse events
     * @param ev
     */
    handler: function(ev) {
        if(ev.type == 'mousedown' && ev.button === 0) {
            this._pressed = true;
        }

        // mousebutton must be down
        if(!this._pressed) {
            return;
        }

        if(ev.type == 'mouseup' || ev.type == 'mouseout') {
            this._pressed = false;
        }

        var data = {
            pointers: ev,
            changedPointers: ev,
            pointerType: 'mouse',
            _event: ev
        };

        var types = {
            'mousedown': 'start',
            'mousemove': 'move',
            'mouseup': 'end',
            'mouseout': 'end'
        };

        this.callback(this.inst, types[ev.type], data);
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        removeEvent(this.inst.element, this._events, this._handler);
        removeEvent(window, 'mouseout', this._handler);
    }
};
