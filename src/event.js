Hammer.event = {
    /**
     * these event methods are based on MicroEvent
     * https://github.com/jeromeetienne/microevent.js
     * @param el
     * @param types
     * @param handler
     */
    on: function onEvent(obj, types, handler){
        var ev, t;
        types = types.split(" ");
        for(t=0; t<types.length; t++) {
            ev = types[t];
            obj._events = obj._events || {};
            obj._events[ev] = obj._events[ev]	|| [];
            obj._events[ev].push(handler);
        }
    },
    off: function offEvent(obj, types, handler){
        var ev, t;
        types = types.split(" ");
        for(t=0; t<types.length; t++) {
            ev = types[t];
            obj._events = obj._events || {};
            if(ev in obj._events === false) {
                return;
            }
            obj._events[ev].splice(this._events[ev].indexOf(handler), 1);
        }
    },
    trigger: function triggerEvent(obj, event, data){
        obj._events = obj._events || {};
        if( event in obj._events === false) {
            return;
        }
        for(var i = 0; i < obj._events[event].length; i++){
            obj._events[event][i].call(obj, data);
        }
    },


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
     * this holds the last move event,
     * used to fix empty touchend issue
     * see the onTouch event for an explanation
     */
    _last_move_event: {},


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
                ev = self._last_move_event;
            }
            // store the last move event
            else {
                self._last_move_event = ev;
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
                if(ev.which === 1) { // left mouse button must be pressed
                    triggerHandler.apply(this, arguments);
                }
            });
        }
    },


    /**
     * create touchlist depending on the event
     * @param   TOUCHTYPE   type
     * @param   Event       ev
     */
    getTouchList: function getTouchList(type, ev) {
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
        var touches = this.getTouchList(type, ev);

        return {
            type    : type,
            time    : Date.now(),
            target  : ev.target,
            touches : touches,
            srcEvent: ev,
            center  : Hammer.util.getCenter(touches)
        };
    }
};