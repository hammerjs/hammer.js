var testUtils = {
    /**
     * trigger simple dom event
     * @param obj
     * @param name
     */
    triggerDomEvent: function(obj, name) {
        var event = document.createEvent('Event');
        event.initEvent(name, true, true);
        obj.dispatchEvent(event);
    },


    createTouchEvent: function(name, x, y, identifier) {
        var event = document.createEvent('Event');
        event.initEvent('touch' + name, true, true);

        event.touches = [{
            clientX: x,
            clientY: y,
            identifier: identifier || 0
        }];

        //https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent.changedTouches
        event.changedTouches = [{
            clientX: x,
            clientY: y,
            identifier: identifier || 0
        }];

        return event;
    },

    dispatchTouchEvent: function(el, name, x, y, identifier) {
        var event = testUtils.createTouchEvent(name, x, y, identifier);
        el.dispatchEvent(event);
    }
};
