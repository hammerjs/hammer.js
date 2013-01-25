/*! Hammer.JS - v1.0.0dev - 2013-01-25
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

// if the window events are set...
Hammer.READY = false;

/**
 * setup events to detect gestures on the document
 * @return
 */
function setup() {
    if(Hammer.READY) {
        return;
    }

    // Register all gestures inside Hammer.gestures
    for(var name in Hammer.gestures) {
        if(Hammer.gestures.hasOwnProperty(name)) {
            Hammer.gesture.registerGesture(Hammer.gestures[name]);
        }
    }


    // Add touch events on the window
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
                if(ev.which === 1) {
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
        var touches = [{
            identifier: 1,
            clientX: ev.clientX,
            clientY: ev.clientY,
            pageX: ev.pageX,
            pageY: ev.pageY,
            target: ev.target
        }];

        return touches;
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

Hammer.util = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @param   {Number}    [depth=0]
     * @return  {Object}    dest
     */
    extend: function(dest, src, depth) {
        depth = depth || 0;
        for (var key in src) {
            if(src.hasOwnProperty(key)) {
                if(depth && typeof(src[key]) == 'object') {
                    dest[key] = Hammer.util.extend({}, src[key], depth-1);
                } else {
                    dest[key] = src[key];
                }
            }
        }

        return dest;
    },


    /**
     * get the center of all the touches
     * @param   {TouchList}   touches
     * @return  {Object}      center
     */
    getCenter: function(touches) {
        var props = {
            pageX: 0,
            pageY: 0,
            clientX: 0,
            clientY: 0
        };

        var minmax = {};

        // walk the properties
        for(var p in props) {
            // set initial values
            minmax[p] = {
                min: Infinity,
                max: -Infinity
            };

            // walk touches and get the min and max values
            for(var t= 0,len=touches.length; t<len; t++) {
                minmax[p].min = Math.min(touches[t][p], minmax[p].min);
                minmax[p].max = Math.max(touches[t][p], minmax[p].max);
            }

            // calculate center
            props[p] = Math.round((minmax[p].min + minmax[p].max) / 2);
        }

        return props;
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
     * angle to direction define
     * @param   Touch      touch1
     * @param   Touch      touch2
     * @return {Constant}  direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function(touch1, touch2) {
        var x = Math.abs(touch1.pageX - touch2.pageX),
            y = Math.abs(touch1.pageY - touch2.pageY);

        if(x >= y) {
            return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
        }
        else {
            return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
        }
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
     * calculate the scale factor between two touchLists (fingers)
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
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
        return 1;
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
        if(startEv && ev.touches.length != startEv.touches.length) {
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
        if(type == Hammer.TOUCH_END) {
            // previous gesture, for the double tap since these are two different gesture detections
            var prev = Hammer.gesture.previous;

            // when the touchtime is higher then the max touch time
            // or when the moving distance is too much
            if(ev.touchTime > inst.options.tap_max_touchtime ||
                ev.distance > inst.options.tap_max_distance) {
                return;
            }

            // check if double tap
            if(prev && prev.name == 'tap' &&
                (ev.time - prev.lastEvent.time) < inst.options.doubletap_interval &&
                ev.distance < inst.options.doubletap_distance) {
                Hammer.gesture.current.name = 'doubletap';
            }
            else {
                Hammer.gesture.current.name = 'tap';
            }

            inst.trigger(Hammer.gesture.current.name, ev);
        }
    }
};


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
                break;

            case Hammer.TOUCH_END:
                if(Hammer.gesture.current.name == name) {
                    inst.trigger('dragend', ev);
                }
                break;
        }
    }
};


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

        if(type == Hammer.TOUCH_END) {
            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(Hammer.gesture.current.name == 'drag' &&
                ev.touchTime > inst.options.swipe_min_time &&
                ev.distance > inst.options.swipe_min_distance) {

                inst.trigger(name, ev); // basic drag event
                inst.trigger(name + ev.direction, ev);  // direction event, like dragdown
            }
        }
    }
};


// Transform gesture
// Called before Hammer.gesture.Drag
// events: transformstart, transform, transformend,
//          pinch, pinchin, pinchout,
//          rotate, rotateleft, rotateright
Hammer.gestures.Transform = {
    priority: 45,
    defaults: {
        // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
        transform_min_scale     : 0.1,
        // rotation in degrees
        transform_min_rotation  : 15
    },
    handle: function(type, ev, inst) {
        var name = 'transform',
            first = false;

        switch(type) {
            case Hammer.TOUCH_MOVE:
                var scale_threshold = Math.abs(1-ev.scale);
                var rotation_threshold = Math.abs(ev.rotation);

                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(scale_threshold < inst.options.transform_min_scale &&
                    rotation_threshold < inst.options.transform_min_rotation) {
                    return;
                }

                // first time
                if(Hammer.gesture.current.name != name) {
                    inst.trigger('transformstart', ev);
                }

                Hammer.gesture.current.name = name;
                inst.trigger(name, ev); // basic drag event

                // trigger rotate event
                if(rotation_threshold > inst.options.transform_min_rotation) {
                    inst.trigger('rotate', ev);
                    inst.trigger('rotate'+ ev.direction, ev);  // direction event, like rotateleft
                }

                // trigger pinch event
                if(scale_threshold > inst.options.transform_min_scale) {
                    inst.trigger('pinch', ev);
                    inst.trigger('pinch'+ ((ev.scale < 1) ? 'in' : 'out'), ev);  // direction event, like pinchin
                }
                break;

            case Hammer.TOUCH_END:
                if(Hammer.gesture.current.name == name) {
                    inst.trigger('transformend', ev);
                }
                break;
        }
    }
};


// Touch gesture
// Called as first, tells the user has touched the screen
// events: release
Hammer.gestures.Touch = {
    priority: -Infinity,
    handle: function(type, ev, inst) {
        if(type ==  Hammer.TOUCH_START) {
            inst.trigger('touch', ev);
        }
    }
};


// Release gesture
// Called as last, tells the user has released the screen
// events: release
Hammer.gestures.Release = {
    priority: Infinity,
    handle: function(type, ev, inst) {
        if(type ==  Hammer.TOUCH_END) {
            inst.trigger('release', ev);
        }
    }
};

// Expose Hammer to the global object
window.Hammer = Hammer;

})(window);