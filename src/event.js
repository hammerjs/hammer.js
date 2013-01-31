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

        // touchdevice
        if(Hammer.HAS_TOUCHEVENTS || Hammer.HAS_POINTEREVENTS) {
            this.bindDom(element, Hammer.EVENT_TYPES[type], triggerHandler);
        }
        // mouse
        else {
            this.bindDom(element, Hammer.EVENT_TYPES[type], function(ev) {
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
     * we have different events for each device/browser
     * determine what we need and set them in the Hammer.EVENT_TYPES constant
     */
    determineEventTypes: function determineEventTypes() {
        // determine the eventtype we want to set
        var types;
        if(Hammer.HAS_POINTEREVENTS) {
            types = [
                'MSPointerDown',
                'MSPointerMove',
                'MSPointerUp MSPointerCancel'
            ];
        }
        else if(Hammer.HAS_TOUCHEVENTS) {
            types = [
                'touchstart',
                'touchmove',
                'touchend touchcancel'];
        }
        else {
            types = [
                'mousedown',
                'mousemove',
                'mouseup'];
        }

        Hammer.EVENT_TYPES[Hammer.TOUCH_START]  = types[0];
        Hammer.EVENT_TYPES[Hammer.TOUCH_MOVE]   = types[1];
        Hammer.EVENT_TYPES[Hammer.TOUCH_END]    = types[2];
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
            center  : Hammer.utils.getCenter(touches),
            preventDefault: function() { return ev.preventDefault(); }
        };
    }
};