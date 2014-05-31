var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END,
    mouseout: INPUT_CANCEL
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseout mouseup';

/**
 * Mouse events input
 * @constructor
 */
function MouseInput() {
    this._elEvents = MOUSE_ELEMENT_EVENTS;
    this._winEvents = MOUSE_WINDOW_EVENTS;

    this._allow = true; // used by Input.TouchMouse to disable mouse events
    this._pressed = false; // mousedown state

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function(ev) {
        // @todo check ev.button, IE has different indexes
        if(ev.type == 'mousedown' && ev.button === 0) {
            this._pressed = true;
        }

        // mousebutton must be down, and mouse events are allowed (because of the TouchMouse input)
        if(!this._pressed || !this._allow) {
            return;
        }

        var target = ev.relatedTarget || ev.toElement;
        var mouseout = (ev.type == 'mouseout' && (!target || target.nodeName == 'HTML'));

        if(ev.type == 'mouseup' || mouseout) {
            this._pressed = false;
        }

        var data = {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        };

        this.callback(this.manager, MOUSE_INPUT_MAP[ev.type], data);
    },
});
