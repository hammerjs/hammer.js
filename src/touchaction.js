var PREFIXED_TOUCH_ACTION = prefixed(document.body.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    set: function(value) {
        if (NATIVE_TOUCH_ACTION) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
        }
        this.actions = splitStr(value.toLowerCase());
    },

    update: function(input) {
        // not needed with native support for the touchAction property
        if (NATIVE_TOUCH_ACTION) {
            return;
        }

        var srcEvent = input.srcEvent;
        var direction = input.direction;

        // if the touch action did prevented once this session
        if (this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        var actions = this.actions;
        for (var i = 0; i < actions.length; i++) {
            if (actions[i] == 'none') {
                this.prevent(srcEvent);
            } else if (actions[i] == 'pan-y' && direction & DIRECTION_HORIZONTAL) {
                this.prevent(srcEvent);
            } else if (actions[i] == 'pan-x' && direction & DIRECTION_VERTICAL) {
                this.prevent(srcEvent);
            }
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    prevent: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};
