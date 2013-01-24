/*! Hammer.JS - v1.0.0 - 2013-01-24
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2013 Jorik Tangelder <jorik@eight.nl>;
 * Licensed under the MIT license */

(function( window, undefined ) {
    "use strict";

var Hammer = function(element, options) {
    return new Hammer.Instance(element, options || {});
};


// default settings
Hammer.defaults = {
    // more settings are defined at gestures.js
};


// detect touchevents
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);


// direction defines
Hammer.DIRECTION_DOWN = 'down';
Hammer.DIRECTION_LEFT = 'left';
Hammer.DIRECTION_UP = 'up';
Hammer.DIRECTION_RIGHT = 'right';


// touch event defines
Hammer.TOUCH_START = 'start';
Hammer.TOUCH_MOVE = 'move';
Hammer.TOUCH_END = 'end';

Hammer.READY = false;


/**
 * setup events to detect gestures on the document
 * @return
 */
function setup() {
    if(Hammer.READY) {
        return;
    }

    Hammer.event.onTouch(window, Hammer.TOUCH_MOVE, Hammer.gesture.detect);
    Hammer.event.onTouch(window, Hammer.TOUCH_END, Hammer.gesture.endDetect);

    // Hammer is ready...
    Hammer.READY = true;
}
/**
 * create new hammer instance
 * @param   {HTMLElement}   element
 * @param   {Object}        [options={}]
 * @return  {Object}        instance
 */
Hammer.Instance = function(element, options) {
    var self = this;

    this.element = element;
    this.options = Hammer.util.extend(Hammer.defaults, options || {});

    // setup HammerJS window events
    setup();

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    /**
     * trigger gesture event
     * @param   string      gesture
     * @param   object      ev
     * @return  {*}
     */
    trigger: function(gesture, ev) {
        // put the gesture name in the event data
        ev.gesture = gesture;
        return Hammer.event.trigger(this.element, gesture, ev);
    },


    /**
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function(gesture, handler) {
        return Hammer.event.on(this.element, gesture, handler);
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function(gesture, handler) {
        return Hammer.event.off(this.element, gesture, handler);
    }
};
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
     * touch events with mouse fallback
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like Hammer.TOUCH_MOVE
     * @param   callback
     */
    onTouch: function(element, type, callback) {
        var cb = function(ev) {
            callback.call(this, Hammer.event.collectEventData(element, type, ev));
        };

        var events = {};
        events[Hammer.TOUCH_START]  = Hammer.HAS_TOUCHEVENTS ? 'touchstart' : 'mousedown';
        events[Hammer.TOUCH_MOVE]   = Hammer.HAS_TOUCHEVENTS ? 'touchmove' : 'mousemove';
        events[Hammer.TOUCH_END]    = Hammer.HAS_TOUCHEVENTS ? 'touchend touchcancel' : 'mouseup';

        // touchdevice
        if(Hammer.HAS_TOUCHEVENTS) {
            Hammer.event.on(element, events[type], cb);
        }
        // mouse
        else {
            Hammer.event.on(element, events[type], function(ev) {
                if(ev.which === 1) {
                    cb.apply(this, arguments);
                }
            });
        }
    },


    /**
     * collect event data for Hammer js
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like Hammer.TOUCH_MOVE
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
            center: Hammer.util.getCenter(touches)
        };
    }
};
Hammer.util = {
    /**
     * simple extend method
     * @param   Object      obj1
     * @param   Object      obj2
     * @return  Object      obj1
     */
    extend: function(obj1, obj2) {
        for (var key in obj2) {
            obj1[key] = obj2[key];
        }
        return obj1;
    },


    /**
     * get the center of all the touches
     * @param   TouchList   touches
     * @return  Object      center  {pageX, pageY}
     */
    getCenter: function(touches) {
        return touches[0];
    },


    /**
     * calculate the distance between two points
     * @param   Number      pos1
     * @param   Number      pos2
     */
    getSimpleDistance: function(pos1, pos2) {
        return Math.abs(pos2 - pos1);
    },


    /**
     * calculate the angle between two coordinates
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getAngle: function(touch1, touch2) {
        var y = touch2.pageY - touch1.pageY,
            x = touch2.pageX - touch1.pageX;
        return Math.atan2(y, x) * 180 / Math.PI;
    },


    /**
     * calculate the distance between two touches
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getDistance: function(touch1, touch2) {
        var x = touch2.pageX - touch1.pageX,
            y = touch2.pageY - touch1.pageY;
        return Math.sqrt((x*x) + (y*y));
    },


    /**
     * angle to direction define
     * @param  {Number}     angle
     * @return {String}     int direction
     */
    getDirection: function(angle) {
        var directions = {
            DIRECTION_DOWN  : angle >= 45 && angle < 135,
            DIRECTION_LEFT  : angle >= 135 || angle <= -135,
            DIRECTION_UP    : angle < -45 && angle > -135,
            DIRECTION_RIGHT : angle >= -45 && angle <= 45
        };

        for(var key in directions){
            if(directions[key]) {
                return Hammer[key];
            }
        }
        return null;
    },


    /**
     * calculate the scale size between two touchLists (fingers)
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       scale
     */
    getScale: function(start, end) {
        // need two fingers...
        if(start.length == 2 && end.length == 2) {
            return Hammer.util.getDistance(end[0], end[1]) /
                Hammer.util.getDistance(start[0], start[1]);
        }
        return 0;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       rotation
     */
    getRotation: function(start, end) {
        // need two fingers
        if(start.length == 2 && end.length == 2) {
            return Hammer.util.getAngle(end[1], end[0]) -
                Hammer.util.getAngle(start[1], start[0]);
        }
        return 0;
    }
};

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
            lastEvent   : ev, // last eventData
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

            // store last event
            Hammer.gesture.current.lastEvent = eventData;

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

        Hammer.util.extend(ev, {
            touchTime   : (ev.time - startEv.time),

            distance    : Hammer.util.getDistance(startEv.center, ev.center),
            distanceX   : Hammer.util.getSimpleDistance(startEv.center.pageX, ev.center.pageX),
            distanceY   : Hammer.util.getSimpleDistance(startEv.center.pageY, ev.center.pageY),
            direction   : Hammer.util.getDirection(Hammer.util.getAngle(startEv.center, ev.center)),

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


Hammer.gestures = {};


// Hold gesture
// Touch stays at the same place for x time
// events: hold
Hammer.gestures.Hold = {
    priority: 10,
    defaults: {
        hold_timeout: 500
    },
    timer: null,
    handle: function(type, ev, inst) {
        switch(type) {
            case Hammer.TOUCH_START:
                // clear any running timers
                clearTimeout(Hammer.gestures.Hold.timer);

                // set the gesture so we can check in the timeout if it still is
                Hammer.gesture.current.name = 'hold';

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                Hammer.gestures.Hold.timer = setTimeout(function() {
                    if(Hammer.gesture.current.name == 'hold') {
                        inst.trigger("hold", ev);
                    }
                }, inst.options.hold_timeout);
                break;

            // when you move or end we clear the timer
            case Hammer.TOUCH_MOVE:
            case Hammer.TOUCH_END:
                clearTimeout(Hammer.gestures.Hold.timer);
                break;
        }
    }
};
Hammer.gesture.registerGesture(Hammer.gestures.Hold);



// Tap/DoubleTap gesture
// Quick touch at a place or double at the same place
// events: tap, doubletap
Hammer.gestures.Tap = {
    priority: 100,
    defaults: {
        tap_max_touchtime  : 250,
        tap_max_distance   : 10,
        doubletap_distance : 20,
        doubletap_interval : 300
    },
    handle: function(type, ev, inst) {
        switch(type) {
            case Hammer.TOUCH_END:
                // when the touchtime is higher then the max touch time
                // or when the moving distance is too much
                if(ev.touchTime > inst.options.tap_max_touchtime ||
                    ev.distance > inst.options.tap_max_distance) {
                    return;
                }

                // check if double tap
                if(Hammer.gesture.previous && Hammer.gesture.previous.gesture == 'tap' &&
                    (ev.time - Hammer.gesture.previous.lastHammer.event.time) < inst.options.doubletap_interval &&
                    ev.distance < inst.options.doubletap_distance)
                {
                    Hammer.gesture.current.name = 'doubletap';
                }
                else {
                    Hammer.gesture.current.name = 'tap';
                }

                inst.trigger(Hammer.gesture.current.name, ev);
                break;
        }
    }
};
Hammer.gesture.registerGesture(Hammer.gestures.Tap);



// Drag gesture
// Quick touch at a place or double at the same place
// events:  dragstart, drag, dragend,
//          drapleft, dragright, dragup, dragdown
Hammer.gestures.Drag = {
    priority: 50,
    defaults: {
        drag_min_distance : 10
    },
    handle: function(type, ev, inst) {
        var name = 'drag',
            first = false;

        switch(type) {
            case Hammer.TOUCH_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(ev.distance < inst.options.drag_min_distance &&
                    Hammer.gesture.current.name != name) {
                    return;
                }

                // first time
                if(Hammer.gesture.current.name != name) {
                    inst.trigger('dragstart', ev);
                }

                Hammer.gesture.current.name = name;
                inst.trigger(name, ev); // basic drag event
                inst.trigger(name + ev.direction, ev);  // direction event, like dragdown

                // stop browser from scrolling
                ev.originalEvent.preventDefault();
                break;

            case Hammer.TOUCH_END:
                if(Hammer.gesture.current.name == name) {
                    inst.trigger('dragend', ev);

                    // stop browser from scrolling
                    ev.originalEvent.preventDefault();
                }
                break;
        }
    }
};
Hammer.gesture.registerGesture(Hammer.gestures.Drag);



// Swipe gesture
// Called after Hammer.gesture.Drag
// events: swipe, swipeleft, swiperight, swipeup, swipedown
Hammer.gestures.Swipe = {
    priority: 51,
    defaults: {
        swipe_min_time     : 150,
        swipe_min_distance : 20
    },
    handle: function(type, ev, inst) {
        var name = 'swipe';

        switch(type) {
            case Hammer.TOUCH_END:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(Hammer.gesture.current.name == 'drag' &&
                    ev.touchTime > inst.options.swipe_min_time &&
                    ev.distance > inst.options.swipe_min_distance) {

                    inst.trigger(name, ev); // basic drag event
                    inst.trigger(name + ev.direction, ev);  // direction event, like dragdown
                }
                break;
        }
    }
};
Hammer.gesture.registerGesture(Hammer.gestures.Swipe);



// Transform gesture
// Called before Hammer.gesture.Drag
// events: transformstart, transform, transformend,
//          pinch, pinchin, pinchout,
//          rotate, rotateleft, rotateright
Hammer.gestures.Transform = {
    priority: 45,
    defaults: {
        transform_min_scale     : .1,
        transform_min_rotation  : 15   // degrees
    },
    handle: function(type, ev, inst) {
        var name = 'transform',
            first = false;

        switch(type) {
            case Hammer.TOUCH_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if((ev.scale < inst.options.transform_min_scale ||
                   ev.rotation < inst.options.transform_min_rotate) &&
                    Hammer.gesture.current.name != name) {
                    return;
                }

                // first time
                if(Hammer.gesture.current.name != name) {
                    inst.trigger('transformstart', ev);
                }

                Hammer.gesture.current.name = name;
                inst.trigger(name, ev); // basic drag event

                // trigger rotate event
                if(Math.abs(ev.rotate) > inst.options.transform_min_rotate) {
                    inst.trigger('rotate', ev);
                    inst.trigger('rotate'+ev.direction, ev);  // direction event, like rotateleft
                }

                // trigger pinch event
                if(Math.abs(ev.scale) > inst.options.transform_min_scale) {
                    inst.trigger('pinch', ev);
                    inst.trigger('pinch'+ (ev.scale > 0) ? 'in' : 'out', ev);  // direction event, like pinchin
                }

                // stop browser from scrolling
                ev.originalEvent.preventDefault();

                // stop other events
                return false;
                break;

            case Hammer.TOUCH_END:
                if(Hammer.gesture.current.name == name) {
                    inst.trigger('transformend', ev);

                    // stop browser from scrolling
                    ev.originalEvent.preventDefault();
                }
                break;
        }
    }
};
Hammer.gesture.registerGesture(Hammer.gestures.Transform);



// Release gesture
// Called as last, tells the user has released the screen
// events: release
Hammer.gestures.Release = {
    priority: 999,
    handle: function(type, ev, inst) {
        switch(type) {
            case Hammer.TOUCH_END:
                inst.trigger('release', ev);
                break;
        }
    }
};
Hammer.gesture.registerGesture(Hammer.gestures.Release);
// Expose Hammer to the global object
window.Hammer = Hammer;

})(window);