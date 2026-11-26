var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup blur';

/**
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
    this.evEl = MOUSE_ELEMENT_EVENTS;
    this.evWin = MOUSE_WINDOW_EVENTS;

    this.pressed = false; // mousedown state
    this.lastEv = null;

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function MEhandler(ev) {
        if (ev.type === 'blur') {
            var lastEv = this.pressed && this.lastEv;
            this.pressed = false;
            this.lastEv = null;
            if (lastEv) {
                this.callback(this.manager, INPUT_CANCEL, {
                    pointers: [lastEv],
                    changedPointers: [lastEv],
                    pointerType: INPUT_TYPE_MOUSE,
                    srcEvent: ev
                });
            }
            return;
        }
        if (!isAllowedPointerType(this.manager, INPUT_TYPE_MOUSE)) {
            return;
        }
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want to have the left mouse button down
        if (eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
        }

        if (eventType & INPUT_MOVE && ev.which !== 1 && !(ev.buttons & 1)) {
            eventType = INPUT_END;
        }

        // mouse must be down
        if (!this.pressed) {
            return;
        }

        if (eventType & INPUT_END) {
            this.pressed = false;
            this.lastEv = null;
        } else {
            this.lastEv = ev;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    },

    reset: function() {
        this.pressed = false;
        this.lastEv = null;
    }
});
