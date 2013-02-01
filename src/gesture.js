Hammer.gesture = {
    // contains all registred Hammer.gestures in the correct order
    gestures: [],

    // data of the current Hammer.gesture detection session
    current: null,

    // the previous Hammer.gesture session data
    // is a full clone of the previous gesture.current object
    previous: null,


    /**
     * start Hammer.gesture detection
     * @param   HammerInstane   inst
     * @param   Event           ev
     */
    startDetect: function startDetect(inst, ev) {
        // already busy with an Hammer.gesture detection on a element
        if(this.current) {
            return;
        }

        this.current = {
            inst        : inst, // reference to HammerInstance we're working for
            startEvent  : Hammer.utils.extend({}, ev), // start eventData for distances, timing etc
            lastEvent   : false, // last eventData
            name        : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
        };

        return this.detect(ev);
    },


    /**
     * Hammer.gesture detection
     * @param   Event           ev
     */
    detect: function detect(ev) {
        if(!this.current) {
            return;
        }

        // extend event data with calculations about scale, distance etc
        var eventData = this.extendEventData(ev);

        // instance options
        var inst_options = this.current.inst.options;

        // call Hammer.gesture handles
        for(var g=0,len=this.gestures.length; g<len; g++) {
            var gesture = this.gestures[g];

            // only when the instance options have enabled this gesture
            if(inst_options[gesture.name] !== false) {
                // if a handle returns false
                // we stop with the detection
                if(gesture.handler.call(gesture, eventData.type, eventData, this.current.inst) === false) {
                    this.stop();
                    break;
                }
            }
        }

        // store as previous event event
        this.current.lastEvent = eventData;
    },


    /**
     * end Hammer.gesture detection
     * @param   Event           ev
     */
    endDetect: function endDetect(ev) {
        this.detect(ev);
        this.stop();
    },


    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     */
    stop: function stop() {
        // clone current data to the store as the previous gesture
        // used for the double tap gesture, since this is an other gesture detect session
        this.previous = Hammer.utils.extend({}, this.current);

        // reset the current
        this.current = null;
    },


    /**
     * extend eventData for Hammer.gestures
     * @param   object   eventData
     * @return  object
     */
    extendEventData: function extendEventData(ev) {
        var startEv = this.current.startEvent;

        // if the touches change, set the new touches over the startEvent touches
        // this because touchevents don't have all the touches on touchstart, or the
        // user must place his fingers at the EXACT same time on the screen, which is not realistic
        if(startEv && ev.touches.length != startEv.touches.length) {
            // extend 1 level deep to get the touchlist with the touch objects
            startEv.touches = Hammer.utils.extend({}, ev.touches, 1);
        }

        Hammer.utils.extend(ev, {
            touchTime   : (ev.time - startEv.time),

            angle       : Hammer.utils.getAngle(startEv.center, ev.center),
            direction   : Hammer.utils.getDirection(startEv.center, ev.center),

            distance    : Hammer.utils.getDistance(startEv.center, ev.center),
            distanceX   : Hammer.utils.getSimpleDistance(startEv.center.pageX, ev.center.pageX),
            distanceY   : Hammer.utils.getSimpleDistance(startEv.center.pageY, ev.center.pageY),

            scale       : Hammer.utils.getScale(startEv.touches, ev.touches),
            rotation    : Hammer.utils.getRotation(startEv.touches, ev.touches),

            startEvent  : startEv
        });

        return ev;
    },


    /**
     * register new gesture
     * @param   Gesture instance, see gestures.js for documentation
     */
    register: function register(gesture) {
        // add an enable gesture options if there is no given
        var options = gesture.defaults || {};
        if(typeof(options[gesture.name]) == 'undefined') {
            options[gesture.name] = true;
        }

        // extend Hammer default options with the Hammer.gesture options
        Hammer.utils.extend(Hammer.defaults, options);

        // set it's index
        gesture.index = gesture.index || 1000;

        // add Hammer.gesture to the list
        this.gestures.push(gesture);

        // sort the list by index
        this.gestures.sort(function(a, b) {
            if (a.index < b.index)
                return -1;
            if (a.index > b.index)
                return 1;
            return 0;
        });
    }
};