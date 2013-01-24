var Gesture = hammer.Gesture = {
    // contains all gestures
    gestures: [],

    // data per gesture detection session
    current: null,

    // store previous gesture data
    previous: null,


    /**
     * start gesture detection
     * @param   HammerInstane   inst
     * @param   Event           ev
     */
    startDetect: function(inst, ev) {
        // already busy with an gesture detection on a element
        if(Gesture.current) {
            return;
        }

        Gesture.current = {
            inst: inst, // reference to HammerInstance we're working for
            startEvent: Util.extend({}, ev), // start eventData for distances, timing etc
            lastEvent: ev, // last eventData
            gesture: false // current gesture we're in, can be 'tap', 'hold' etc
        };

        Gesture.detect(ev);
    },


    /**
     * gesture detection
     * @param   Event           ev
     */
    detect: function(ev) {
        if(Gesture.current) {
            // extend event data with calculations about scale, distance etc
            var eventData = Gesture.extendEventData(ev);

            // store last event
            Gesture.current.lastEvent = eventData;

            // call gesture handles
            for(var g=0,len=Gesture.gestures.length; g<len; g++) {
                // if a handle returns false
                // we stop with the detection
                var retval = Gesture.gestures[g].handle(eventData.type, eventData, Gesture.current.inst);
                if(retval === false) {
                    Gesture.stop();
                    break;
                }
            }
        }
    },


    /**
     * end gesture detection
     * @param   Event           ev
     */
    endDetect: function(ev) {
        Gesture.detect(ev);
        Gesture.stop();
    },


    /**
     * clear the gesture vars
     * this is called on endDetect, but can also be used when a final gesture has been detected
     * to stop other gestures from being fired
     */
    stop: function() {
        Gesture.previous = Util.extend({}, Gesture.current);
        Gesture.current = null;
    },


    /**
     * extend eventData for gestures
     * @param   object   eventData
     * @return  object
     */
    extendEventData: function(ev) {
        var startEv = Gesture.current.startEvent;

        Util.extend(ev, {
            touchTime: (ev.time - startEv.time),

            distance: Util.getDistance(startEv.center, ev.center),
            distanceX: Util.getSimpleDistance(startEv.center.pageX, ev.center.pageX),
            distanceY: Util.getSimpleDistance(startEv.center.pageY, ev.center.pageY),
            direction: Util.getDirection(Util.getAngle(startEv.center, ev.center)),

            scale: Util.getScale(startEv.touches, ev.touches),
            rotation: Util.getRotation(startEv.touches, ev.touches),

            start: startEv  // start event data
        });

        return ev;
    },


    /**
     * register new gesture
     */
    registerGesture: function(gs) {
        // extend hammer default options with the gesture options
        Util.extend(hammer.defaults, gs.defaults || {});

        // set it's index
        gs.priority = gs.priority || 1000;

        // add gesture to the list
        Gesture.gestures.push(gs);

        // sort the list by index
        Gesture.gestures.sort(function(a, b) {
            if (a.priority < b.priority)
                return -1;
            if (a.priority > b.priority)
                return 1;
            return 0;
        });
    }
};

