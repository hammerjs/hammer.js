Hammer.event = {
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
     * this holds the last move event,
     * used to fix empty touchend issue
     * see the onTouch event for an explanation
     */
    _last_move_event: {},


    /**
     * this holds the first mouse event,
     * used for multitouch with mouse and keyboard
     * see the onTouch event for an explanation
     */
    _first_mouse_pos: {},


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}      element
     * @param   {Constant}       type        like Hammer.TOUCH_MOVE
     * @param   handler
     */
    onTouch: function(element, type, handler) {
        var triggerHandler = function(ev) {
            // because touchend has no touches, and we often want to use these in our gestures,
            // we send the last move event as our eventData in touchend
            if(type === Hammer.TOUCH_END) {
                ev = Hammer.event._last_move_event;
            }
            // store the last move event
            else {
                Hammer.event._last_move_event = ev;
            }

            handler.call(this, Hammer.event.collectEventData(element, type, ev));
        };

        var events = {};
        events[Hammer.TOUCH_START]  = Hammer.HAS_TOUCHEVENTS ? 'touchstart gesturestart gesturechange' : 'mousedown';
        events[Hammer.TOUCH_MOVE]   = Hammer.HAS_TOUCHEVENTS ? 'touchmove' : 'mousemove';
        events[Hammer.TOUCH_END]    = Hammer.HAS_TOUCHEVENTS ? 'touchend touchcancel gestureend' : 'mouseup';

        // touchdevice
        if(Hammer.HAS_TOUCHEVENTS) {
            Hammer.event.on(element, events[type], triggerHandler);
        }
        // mouse
        else {
            Hammer.event.on(element, events[type], function(ev) {
                if(ev.which === 1) { // left mouse button must be pressed
                    triggerHandler.apply(this, arguments);
                }
            });
        }
    },


    /**
     * create fake touchlist when there is no event.touches
     * the extension hammer.debug adds multitouch for desktop available and overwrites this
     * @param   TOUCHTYPE   type
     * @param   Event       ev
     */
    createFakeTouchList: function(type, ev) {
        return [{
            identifier: 1,
            pageX: ev.pageX,
            pageY: ev.pageY,
            target: ev.target
        }];
    },


    /**
     * collect event data for Hammer js
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like Hammer.TOUCH_MOVE
     * @param   Event           ev
     */
    collectEventData: function(element, type, ev) {
        var touches = ev.touches;

        // create a fake touchlist when no touches are found
        // this would be with a mouse on a pc
        if(!touches) {
            touches = Hammer.event.createFakeTouchList(type, ev);
        }

        return {
            type: type,
            time: Date.now(),
            target: ev.target,
            touches: touches,
            touchEvent: ev,
            center: Hammer.util.getCenter(touches)
        };
    }
};