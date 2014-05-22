// constants
var INPUT_MOUSE_TYPE_MAP = {
    'mousedown': INPUT_EVENT_START,
    'mousemove': INPUT_EVENT_MOVE,
    'mouseup': INPUT_EVENT_END,
    'mouseout': INPUT_EVENT_END
};

var INPUT_MOUSE_EVENTS = 'mousedown mousemove mouseup';
var INPUT_MOUSE_WINDOW_EVENTS = 'mouseout';

/**
 * Mouse events input
 * @param inst
 * @param callback
 * @constructor
 */
Input.Mouse = function(inst, callback) {
    this.inst = inst;
    this.callback = callback;

    this._allow = true; // used by Input.TouchMouse to disable mouse events
    this._pressed = false; // mousedown state

    this._handler = bindFn(this.handler, this);

    addEvent(this.inst.element, INPUT_MOUSE_EVENTS, this._handler);
    addEvent(window, INPUT_MOUSE_WINDOW_EVENTS, this._handler);
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

        // mousebutton must be down, and mouse events are allowed (because of the TouchMouse input)
        if(!this._pressed || !this._allow) {
            return;
        }

        if(ev.type == 'mouseup' || ev.type == 'mouseout') {
            this._pressed = false;
        }

        // fake identifier
        ev.identifier = 1;

        var data = {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            _event: ev
        };

        this.callback(this.inst, INPUT_MOUSE_TYPE_MAP[ev.type], data);
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        removeEvent(this.inst.element, INPUT_MOUSE_EVENTS, this._handler);
        removeEvent(window, INPUT_MOUSE_WINDOW_EVENTS, this._handler);
    }
};
