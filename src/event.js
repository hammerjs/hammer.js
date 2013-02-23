/**
 * this holds the last move event,
 * used to fix empty touchend issue
 * see the onTouch event for an explanation
 * @type {Object}
 */
var last_move_event = null;


/**
 * when the mouse is hold down, this is true
 * @type {Boolean}
 */
var touchdown = false;


Hammer.event = {
    /**
     * simple addEventListener
     * @param   {HTMLElement}   element
     * @param   {String}        type
     * @param   {Function}      handler
     */
    bindDom: function(element, type, handler) {
        var types = type.split(' ');
        for(var t=0; t<types.length; t++) {
            element.addEventListener(types[t], handler, false);
        }
    },


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like Hammer.EVENT_MOVE
     * @param   {Function}      handler
     */
    onTouch: function onTouch(element, eventType, handler) {
		var self = this;

        function triggerHandler(ev) {
            // because touchend has no touches, and we often want to use these in our gestures,
            // we send the last move event as our eventData in touchend
            if(eventType === Hammer.EVENT_END) {
                if (last_move_event !== null) {
                    ev = last_move_event;
                }
            }
            // store the last move event
            else {
                last_move_event = ev;
            }

            handler.call(Hammer.gesture, self.collectEventData(element, eventType, ev));
        }

        // ontouchstart
        if(Hammer.HAS_TOUCHEVENTS && !Hammer.HAS_POINTEREVENTS) {
            this.bindDom(element, Hammer.EVENT_TYPES[eventType], function(ev) {
                triggerHandler.call(this, ev);
            });
        }

        // mouseevents and pointerEvents (win8)
        else {
            this.bindDom(element, Hammer.EVENT_TYPES[eventType], function(ev) {
                // touch must be down or a touch element
                if(ev.type.match(/down|move/i) &&
                    (ev.which === 1 || (ev.pointerType && ev.MSPOINTER_TYPE_TOUCH &&
                                        ev.pointerType == ev.MSPOINTER_TYPE_TOUCH)
                    )) {
                    touchdown = true;
                }

                if(touchdown) {
                    // update pointer
                    if(Hammer.HAS_POINTEREVENTS && eventType != Hammer.EVENT_END) {
                        Hammer.PointerEvent.updatePointer(eventType, ev);
                    }

                    triggerHandler.call(this, ev);

                    // remove pointer after the handler is done
                    if(Hammer.HAS_POINTEREVENTS && eventType == Hammer.EVENT_END) {
                        Hammer.PointerEvent.updatePointer(eventType, ev);
                    }
                }
                else {
                    Hammer.PointerEvent.reset();
                }

                if(ev.type.match(/up|cancel/i)) {
                    touchdown = false;
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

        Hammer.EVENT_TYPES[Hammer.EVENT_START]  = types[0];
        Hammer.EVENT_TYPES[Hammer.EVENT_MOVE]   = types[1];
        Hammer.EVENT_TYPES[Hammer.EVENT_END]    = types[2];
    },


    /**
     * create touchlist depending on the event
     * @param   {Object}    ev
     * @param   {String}    eventType
     */
    getTouchList: function getTouchList(ev, eventType) {
        if(Hammer.HAS_POINTEREVENTS) {
            return Hammer.PointerEvent.getTouchList();
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
     * @param   {HTMLElement}   element
     * @param   {String}        eventType        like Hammer.EVENT_MOVE
     * @param   {Object}        eventData
     */
    collectEventData: function collectEventData(element, eventType, ev) {
        var touches = this.getTouchList(ev, eventType);

        var pointerType = Hammer.POINTER_TOUCH;
        if(ev.type.match(/mouse/) ||
            (ev.poinerType && ev.pointerType == ev.MSPOINTER_TYPE_MOUSE)) {
            pointerType = Hammer.POINTER_MOUSE;
        }

        return {
            center      : Hammer.utils.getCenter(touches),
            timestamp   : ev.timestamp || new Date().getTime(), // for IE
            target      : ev.target,
            touches     : touches,
            eventType   : eventType,
            pointerType : pointerType,
            srcEvent    : ev,

            /**
             * prevent the browser default actions
             * mostly used to disable scrolling of the browser
             */
            preventDefault: function() {
                if(this.srcEvent.preventManipulation) {
                    this.srcEvent.preventManipulation();
                }

                if(this.srcEvent.preventDefault) {
                    this.srcEvent.preventDefault();
                }
            },

            /**
             * stop bubbling the event up to its parents
             */
            stopPropagation: function() {
                this.srcEvent.stopPropagation();
            },

            /**
             * immediately stop gesture detection
             * might be useful after a swipe was detected
             * @return {*}
             */
            stop: function() {
                return Hammer.gesture.stop();
            }
        };
    }
};