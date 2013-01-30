/**
 * this holds the last move event,
 * used to fix empty touchend issue
 * see the onTouch event for an explanation
 * @type {Object}
 */
var last_move_event = {};

/**
 * when the mouse is hold down, this is true
 * @type {Boolean}
 */
var mousedown = false;


Hammer.event = {
    /**
     * simple addEventListener
     * @param element
     * @param types
     * @param handler
     */
    bindDom: function(element, types, handler) {
        types = types.split(" ");
        for(var t=0; t<types.length; t++) {
            element.addEventListener(types[t], handler, false);
        }
    },


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}      element
     * @param   {Constant}       type        like Hammer.TOUCH_MOVE
     * @param   handler
     */
    onTouch: function onTouch(element, type, handler) {
        var self = this;
        var triggerHandler = function(ev) {
            // PointerEvents update
            if(Hammer.HAS_POINTEREVENTS) {
                Hammer.PointerEvent.updatePointer(type, ev);
            }

            // because touchend has no touches, and we often want to use these in our gestures,
            // we send the last move event as our eventData in touchend
            if(type === Hammer.TOUCH_END) {
                ev = last_move_event;
            }
            // store the last move event
            else {
                last_move_event = ev;
            }
            handler.call(this, self.collectEventData(element, type, ev));
        };


        // determine the eventtype we want to set
        var event_types;
        if(Hammer.HAS_POINTEREVENTS) {
            event_types = ['MSPointerDown', 'MSPointerMove', 'MSPointerUp MSPointerCancel'];
        }
        else if(Hammer.HAS_TOUCHEVENTS) {
            event_types = ['touchstart', 'touchmove', 'touchend touchcancel'];
        }
        else {
            event_types = ['mousedown', 'mousemove', 'mouseup'];
        }


        var events ={};
        events[Hammer.TOUCH_START]  = event_types[0];
        events[Hammer.TOUCH_MOVE]   = event_types[1];
        events[Hammer.TOUCH_END]    = event_types[2];


        // touchdevice
        if(Hammer.HAS_TOUCHEVENTS || Hammer.HAS_POINTEREVENTS) {
            this.bindDom(element, events[type], triggerHandler);
        }
        // mouse
        else {
            this.bindDom(element, events[type], function(ev) {
                // left mouse button must be pressed
                // ev.button === 1 is for IE
                if(ev.which === 1 || ev.button === 1) {
                    mousedown = true;
                    triggerHandler.apply(this, arguments);
                }

                if(ev.type == 'mouseup') {
                    mousedown = false;
                }
            });
        }
    },


    /**
     * create touchlist depending on the event
     * @param   Event       ev
     */
    getTouchList: function getTouchList(ev, type) {
        if(Hammer.HAS_POINTEREVENTS) {
            return Hammer.PointerEvent.getPointers();
        }
        else if(Hammer.HAS_TOUCHEVENTS) {
            return ev.touches;
        }
        else {
            return [{
                identifier: 1,
                pageX: ev.pageX,
                pageY: ev.pageY,
                target: ev.target
            }];
        }
    },


    /**
     * collect event data for Hammer js
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like Hammer.TOUCH_MOVE
     * @param   Event           ev
     */
    collectEventData: function collectEventData(element, type, ev) {
        var touches = this.getTouchList(ev, type);

        return {
            type    : type,
            time    : new Date().getTime(), // for IE
            target  : ev.target,
            touches : touches,
            srcEvent: ev,
            center  : Hammer.utils.getCenter(touches)
        };
    }
};