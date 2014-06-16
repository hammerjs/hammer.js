var PREFIXED_TOUCH_ACTION = prefixed(document.body.style, 'touchAction');
var NATIVE_TOUCH_ACTION = typeof PREFIXED_TOUCH_ACTION !== TYPE_UNDEFINED;

function TouchAction(manager) {
    this.manager = manager;
}

TouchAction.prototype = {
    set: function(value) {
        if(NATIVE_TOUCH_ACTION) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
            return;
        }
        this.actions = splitStr(value.toLowerCase());
    },

    update: function(input) {
        // not needed with native support for the touchAction property
        if(NATIVE_TOUCH_ACTION) {
            return;
        }

        var srcEvent = input.srcEvent;
        var direction = input.direction;

        // if the touch action did prevented once this session
        if(this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

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
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    prevent: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};
