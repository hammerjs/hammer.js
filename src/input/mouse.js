var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END
};

var MOUSE_BUTTON_MASKS = [1, 4, 2, 8, 16];

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

/**
 * compute the W3C buttons bitmask of mouse buttons allowed by manager.options.mouseButtons
 * @param {Manager} manager
 * @returns {Number}
 */
function getMouseButtonsMask(manager) {
    var allowed = manager.options.mouseButtons;
    if (!allowed) {
        return 1;
    }
    var mask = 0;
    for (var i = 0; i < allowed.length; i++) {
        mask |= MOUSE_BUTTON_MASKS[allowed[i]];
    }
    return mask;
}

/**
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
    this.evEl = MOUSE_ELEMENT_EVENTS;
    this.evWin = MOUSE_WINDOW_EVENTS;

    this.pressed = false; // mousedown state
    this.activeButton = 0;

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function MEhandler(ev) {
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want an allowed mouse button down (ignore chorded mousedown while pressed)
        if (eventType & INPUT_START) {
            if (this.pressed || !(getMouseButtonsMask(this.manager) & MOUSE_BUTTON_MASKS[ev.button])) {
                return;
            }
            this.pressed = true;
            this.activeButton = ev.button;
        }

        // mouse must be down
        if (!this.pressed) {
            return;
        }

        if (eventType & INPUT_MOVE &&
            ev.which !== (this.activeButton + 1) &&
            !(ev.buttons & MOUSE_BUTTON_MASKS[this.activeButton])) {
            eventType = INPUT_END;
        }

        if (eventType & INPUT_END) {
            if (ev.type === 'mouseup' && ev.button != null && ev.button !== this.activeButton) {
                return;
            }
            this.pressed = false;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    }
});
