var Event = hammer.Event = {

    /**
     * on, off and trigger events can be overwritten for better browsercompat
     */
    on: function(element, types, callback) {
        types = types.split(" ");
        for(var t=0; t<types.length; t++) {
            element.addEventListener(types[t], callback, false);
        }
    },

    off: function(element, types, callback) {
        types = types.split(" ");
        for(var t=0; t<types.length; t++) {
            element.removeEventListener(types[t], callback, false);
        }
    },

    trigger: function(element, type, data) {
        var event = document.createEvent("Event");
        event.initEvent(type, true, true);
        event.hammer = data;
        element.dispatchEvent(event);
    },


    /**
     * touch events with mouse fallback
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like hammer.TOUCH_MOVE
     * @param   callback
     */
    onTouch: function(element, type, callback) {
        var cb = function(ev) {
            callback.call(this, Event.collectEventData(element, type, ev));
        };

        var events = {};
        events[hammer.TOUCH_START]  = hammer.HAS_TOUCHEVENTS ? 'touchstart' : 'mousedown';
        events[hammer.TOUCH_MOVE]   = hammer.HAS_TOUCHEVENTS ? 'touchmove' : 'mousemove';
        events[hammer.TOUCH_END]    = hammer.HAS_TOUCHEVENTS ? 'touchend touchcancel' : 'mouseup';

        // touchdevice
        if(hammer.HAS_TOUCHEVENTS) {
            Event.on(element, events[type], cb);
        }
        // mouse
        else {
            Event.on(element, events[type], function(ev) {
                if(ev.which === 1) {
                    cb.apply(this, arguments);
                }
            });
        }
    },


    /**
     * collect event data for hammer js
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like hammer.TOUCH_MOVE
     * @param   Event           ev
     */
    collectEventData: function(element, type, ev) {
        var touches = ev.touches;

        // create a fake touchlist
        if(!touches) {
            touches = [{
                identifier: 1,
                clientX: ev.clientX,
                clientY: ev.clientY,
                pageX: ev.pageX,
                pageY: ev.pageY,
                target: ev.target
            }];
        }

        return {
            type: type,
            time: Date.now(),
            target: ev.target,
            touches: touches,
            originalEvent: ev,
            center: Util.getCenter(touches)
        };
    }
};