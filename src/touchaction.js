/**
 * set and mimic the touch-action property
 */

var NATIVE_TOUCH_ACTION = typeof prefixed(document.body.style, 'touchAction') !== TYPE_UNDEFINED;

function TouchAction(manager) {
    this.manager = manager;
}

TouchAction.prototype = {
    set: function(value) {
        if(NATIVE_TOUCH_ACTION) {
            prefixed(this.manager.element.style, 'touchAction', value);
        }
        this.actions = splitStr(value.toLowerCase());
    },

    update: function(input) {
        // not needed for native and mouse input
        if(NATIVE_TOUCH_ACTION) {
            return;
        }

        var srcEvent = input.srcEvent;
        var direction = input.direction;

        // if the touch action did prevented once this session,
        // prevent it every time
        if(this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        // split the value, and try to run a value-handler
        for(var i = 0; i < this.actions.length; i++) {
            switch(this.actions[i]) {
                case 'none':
                    this.prevent(srcEvent);
                    break;
                case 'pan-y':
                    if(direction & DIRECTION_HORIZONTAL) {
                        this.prevent(srcEvent);
                    }
                    break;
                case 'pan-x':
                    if(direction & DIRECTION_VERTICAL) {
                        this.prevent(srcEvent);
                    }
                    break;
            }
        }
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
