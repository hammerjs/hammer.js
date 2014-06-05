/**
 * set and mimic the touch-action property
 */

var NATIVE_TOUCH_ACTION = typeof prefixed(document.body.style, 'touchAction') !== TYPE_UNDEFINED;

function TouchAction(manager) {
    this.manager = manager;
}

TouchAction.prototype = {
    set: function(value) {
        this.value = value.toLowerCase();

        if(NATIVE_TOUCH_ACTION) {
            prefixed(this.manager.element.style, 'touchAction', value);
        }
    },

    update: function(input) {
        var event = input.srcEvent;

        // not needed for native and mouse input
        if(NATIVE_TOUCH_ACTION ||
            input.pointerType == INPUT_TYPE_MOUSE ||
            input.eventType === INPUT_START) {
            return;
        }

        // if the touch action did prevented once this session,
        // prevent it everytime
        if(this.manager.session.prevented) {
            event.preventDefault();
            return;
        }

        // split the value, and try to run a value-handler
        var actions = strSplit(this.value);
        var values = this.values;
        for(var i = 0; i < actions.length; i++) {
            if(values[actions[i]]) {
                values[actions[i]](input, event);
            }
        }
    },

    /**
     * touch-action value methods
     */
    values: {
        none: function(input, event) {
            this.prevent(event);
        },
        'pan-y': preventDirection(DIRECTION_HORIZONTAL),
        'pan-x': preventDirection(DIRECTION_VERTICAL),
        'pan-negative-y': preventDirection(DIRECTION_UP),
        'pan-negative-x': preventDirection(DIRECTION_LEFT),
        'pan-positive-y': preventDirection(DIRECTION_DOWN),
        'pan-positive-x': preventDirection(DIRECTION_RIGHT)
    },

    /**
     * call preventDefault and save in the session
     * @param {Object} event
     */
    prevent: function(event) {
        this.manager.session.prevented = true;
        event.preventDefault();
    }
};

function preventDirection(direction) {
    return function(input, event) {
        if(input.direction & direction) {
            this.prevent(event);
        }
    };
}
