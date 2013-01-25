Hammer.gesture = {
    // contains all registred Hammer.gestures in the correct order
    handlers: [],

    // data per Hammer.gesture detection session
    current: null,

    // store previous Hammer.gesture data
    previous: null,


    /**
     * start Hammer.gesture detection
     * @param   HammerInstane   inst
     * @param   Event           ev
     */
    startDetect: function(inst, ev) {
        // already busy with an Hammer.gesture detection on a element
        if(Hammer.gesture.current) {
            return;
        }

        Hammer.gesture.current = {
            inst        : inst, // reference to HammerInstance we're working for
            startEvent  : Hammer.util.extend({}, ev), // start eventData for distances, timing etc
            lastEvent   : false, // last eventData
            name        : false // current gesture we're in/detected, can be 'tap', 'hold' etc
        };

        Hammer.gesture.detect(ev);
    },


    /**
     * Hammer.gesture detection
     * @param   Event           ev
     */
    detect: function(ev) {
        if(Hammer.gesture.current) {
            // extend event data with calculations about scale, distance etc
            var eventData = Hammer.gesture.extendEventData(ev);

            // call Hammer.gesture handles
            for(var g=0,len=Hammer.gesture.handlers.length; g<len; g++) {
                // if a handle returns false
                // we stop with the detection
                var retval = Hammer.gesture.handlers[g](eventData.type, eventData, Hammer.gesture.current.inst);
                if(retval === false) {
                    Hammer.gesture.stop();
                    break;
                }
            }

            // store last event
            Hammer.gesture.current.lastEvent = eventData;
        }
    },


    /**
     * end Hammer.gesture detection
     * @param   Event           ev
     */
    endDetect: function(ev) {
        Hammer.gesture.detect(ev);
        Hammer.gesture.stop();
    },


    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     */
    stop: function() {
        // clone current data to the store as the previous gesture
        // used for the double tap gesture, since this is an other gesture detect session
        Hammer.gesture.previous = Hammer.util.extend({}, Hammer.gesture.current);

        // reset the current
        Hammer.gesture.current = null;
    },


    /**
     * extend eventData for Hammer.gestures
     * @param   object   eventData
     * @return  object
     */
    extendEventData: function(ev) {
        var startEv = Hammer.gesture.current.startEvent;

        // if the touches change, set the new touches over the startEvent touches
        // this because touchevents don't have all the touches on touchstart, or the
        // user must place his fingers at the EXACT same time on the screen, which is not realistic
        if(startEv && ev.touches.length !== startEv.touches.length) {
            // extend 1 level deep to get the touchlist with the touch objects
            startEv.touches = Hammer.util.extend({}, ev.touches, 1);
        }

        Hammer.util.extend(ev, {
            touchTime   : (ev.time - startEv.time),

            angle       : Hammer.util.getAngle(startEv.center, ev.center),
            direction   : Hammer.util.getDirection(startEv.center, ev.center),

            distance    : Hammer.util.getDistance(startEv.center, ev.center),
            distanceX   : Hammer.util.getSimpleDistance(startEv.center.pageX, ev.center.pageX),
            distanceY   : Hammer.util.getSimpleDistance(startEv.center.pageY, ev.center.pageY),

            scale       : Hammer.util.getScale(startEv.touches, ev.touches),
            rotation    : Hammer.util.getRotation(startEv.touches, ev.touches),

            start       : startEv  // start event data
        });

        return ev;
    },


    /**
     * register new gesture
     * @param   Gesture instance, see gestures.js for documentation
     */
    registerGesture: function(gesture) {
        // extend Hammer default options with the Hammer.gesture options
        Hammer.util.extend(Hammer.defaults, gesture.defaults || {});

        // set it's index
        gesture.priority = gesture.priority || 1000;

        // add Hammer.gesture to the list
        Hammer.gesture.handlers.push(gesture.handle);

        // sort the list by index
        Hammer.gesture.handlers.sort(function(a, b) {
            if (a.priority < b.priority)
                return -1;
            if (a.priority > b.priority)
                return 1;
            return 0;
        });
    }
};