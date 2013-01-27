/*! Hammer.JS - v1.0.0dev - 2013-01-27
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
    stop_browser_behavior: true
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
            Hammer.gesture.register(Hammer.gestures[name]);
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
 * all methods should return the instance itself, so it is chainable.
 * @param   {HTMLElement}   element
 * @param   {Object}        [options={}]
 * @return  {Object}        instance
 */
Hammer.Instance = function(element, options) {
    var self = this;

    // setup HammerJS window events and register all gestures
    // this also sets up the default options
    setup();

    this.element = element;

    // merge options
    this.options = Hammer.util.extend(
        Hammer.util.extend({}, Hammer.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
        this.stopBrowserBehavior();
    }

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    stopBrowserBehavior: function stopBrowserBehavior() {
        var prop,
            vendors = ['webkit','moz','o',''],
            css = {
                "userSelect": "none",
                "touchCallout": "none",
                "touchAction": "none",
                "userDrag": "none",
                "tapHighlightColor": "rgba(0,0,0,0)"
            };

        for(var i = 0; i < vendors.length; i++) {
            for(var p in css) {
                if(css.hasOwnProperty(p)) {
                    prop = p;
                    if(vendors[i]) {
                        prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }
                    this.element.style[prop] = css[p];
                }
            }
        }

        return this;
    },

    /**
     * trigger gesture event
     * @param   string      gesture
     * @param   object      ev
     * @return  {*}
     */
    trigger: function triggerInstance(gesture, ev) {
        // put the gesture name in the event data
        ev.gesture = gesture;
        Hammer.event.trigger(this, gesture, ev);
        return this;
    },


    /**
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function onInstance(gesture, handler) {
        Hammer.event.on(this, gesture, handler);
        return this;
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function offInstance(gesture, handler) {
        Hammer.event.off(this, gesture, handler);
        return this;
    }
};

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

        var events = {};
        events[Hammer.TOUCH_START]  = Hammer.HAS_TOUCHEVENTS ? 'touchstart gesturestart gesturechange' : 'mousedown';
        events[Hammer.TOUCH_MOVE]   = Hammer.HAS_TOUCHEVENTS ? 'touchmove' : 'mousemove';
        events[Hammer.TOUCH_END]    = Hammer.HAS_TOUCHEVENTS ? 'touchend touchcancel' : 'mouseup';

        // touchdevice
        if(Hammer.HAS_TOUCHEVENTS) {
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
     * create fake touchlist when there is no event.touches
     * the extension hammer.debug adds multitouch for desktop available and overwrites this
     * @param   TOUCHTYPE   type
     * @param   Event       ev
     */
    createFakeTouchList: function createFakeTouchList(type, ev) {
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
    collectEventData: function collectEventData(element, type, ev) {
        var touches = ev.touches;

        // create a fake touchlist when no touches are found
        // this would be with a mouse on a pc
        if(!touches) {
            touches = this.createFakeTouchList(type, ev);
        }

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

var PI = Math.PI;

Hammer.util = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @param   {Number}    [depth=0]
     * @return  {Object}    dest
     */
    extend: function extend(dest, src, depth) {
        depth = depth || 0;
        for (var key in src) {
            if(src.hasOwnProperty(key)) {
                if(depth && typeof(src[key]) == 'object') {
                    dest[key] = this.extend({}, src[key], depth-1);
                } else {
                    dest[key] = src[key];
                }
            }
        }

        return dest;
    },


    /**
     * faster Math.abs alternative
     * @param   value
     * @return  value
     */
    fastAbs: function fastAbs(value) {
        // equivalent to Math.abs();
        return (value ^ (value >> 31)) - (value >> 31);
    },


    /**
     * get the center of all the touches
     * @param   {TouchList}   touches
     * @return  {Object}      center
     */
    getCenter: function getCenter(touches) {
        var valuesX = [], valuesY = [];

        for(var t= 0,len=touches.length; t<len; t++) {
            valuesX.push(touches[t].pageX);
            valuesY.push(touches[t].pageY);
        }

        return {
            pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
            pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
        };
    },


    /**
     * calculate the distance between two points
     * @param   Number      pos1
     * @param   Number      pos2
     */
    getSimpleDistance: function getSimpleDistance(pos1, pos2) {
        return this.fastAbs(pos2 - pos1);
    },


    /**
     * calculate the angle between two coordinates
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getAngle: function getAngle(touch1, touch2) {
        var y = touch2.pageY - touch1.pageY,
            x = touch2.pageX - touch1.pageX;
        return Math.atan2(y, x) * 180 / PI;
    },


    /**
     * angle to direction define
     * @param   Touch      touch1
     * @param   Touch      touch2
     * @return {Constant}  direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function getDirection(touch1, touch2) {
        var x = this.fastAbs(touch1.pageX - touch2.pageX),
            y = this.fastAbs(touch1.pageY - touch2.pageY);

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
    getDistance: function getDistance(touch1, touch2) {
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
    getScale: function getScale(start, end) {
        // need two fingers...
        if(start.length == 2 && end.length == 2) {
            return this.getDistance(end[0], end[1]) /
                this.getDistance(start[0], start[1]);
        }
        return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       rotation
     */
    getRotation: function getRotation(start, end) {
        // need two fingers
        if(start.length == 2 && end.length == 2) {
            return this.getAngle(end[1], end[0]) -
                this.getAngle(start[1], start[0]);
        }
        return 0;
    }
};

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
        var self = Hammer.gesture;
        // already busy with an Hammer.gesture detection on a element
        if(self.current) {
            return;
        }

        self.current = {
            inst        : inst, // reference to HammerInstance we're working for
            startEvent  : Hammer.util.extend({}, ev), // start eventData for distances, timing etc
            lastEvent   : false, // last eventData
            name        : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
        };

        self.detect(ev);
    },


    /**
     * Hammer.gesture detection
     * @param   Event           ev
     */
    detect: function detect(ev) {
        var self = Hammer.gesture;
        if(self.current) {
            // extend event data with calculations about scale, distance etc
            var eventData = self.extendEventData(ev);

            // instance options
            var inst_options = self.current.inst.options;

            // call Hammer.gesture handles
            for(var g=0,len=self.gestures.length; g<len; g++) {
                var gesture = self.gestures[g];

                // only when the instance options have enabled this gesture
                if(inst_options[gesture.name] !== false) {
                    // if a handle returns false
                    // we stop with the detection
                    var retval = gesture.handler.call(gesture, eventData.type, eventData, self.current.inst);
                    if(retval === false) {
                        self.stop();
                        break;
                    }
                }
            }

            // store as previous event event
            self.current.lastEvent = eventData;
        }
    },


    /**
     * end Hammer.gesture detection
     * @param   Event           ev
     */
    endDetect: function endDetect(ev) {
        var self = Hammer.gesture;
        self.detect(ev);
        self.stop();
    },


    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     */
    stop: function stop() {
        // clone current data to the store as the previous gesture
        // used for the double tap gesture, since this is an other gesture detect session
        this.previous = Hammer.util.extend({}, this.current);

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
        Hammer.util.extend(Hammer.defaults, options);

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

Hammer.gestures = Hammer.gestures || {};


// Hold gesture
// Touch stays at the same place for x time
// events: hold
Hammer.gestures.Hold = {
    name: 'hold',
    index: 10,
    defaults: {
        hold_timeout: 500
    },
    timer: null,
    handler: function holdGesture(type, ev, inst) {
        switch(type) {
            case Hammer.TOUCH_START:
                // clear any running timers
                clearTimeout(this.timer);

                // set the gesture so we can check in the timeout if it still is
                Hammer.gesture.current.name = this.name;

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                this.timer = setTimeout(function(self) {
                    if(Hammer.gesture.current.name == self.name) {
                        inst.trigger(self.name, ev);
                    }
                }, inst.options.hold_timeout, this);
                break;

            // when you move or end we clear the timer
            case Hammer.TOUCH_MOVE:
            case Hammer.TOUCH_END:
                clearTimeout(this.timer);
                break;
        }
    }
};


// Tap/DoubleTap gesture
// Quick touch at a place or double at the same place
// events: tap, doubletap
Hammer.gestures.Tap = {
    name: 'tap',
    index: 100,
    defaults: {
        tap_max_touchtime  : 250,
        tap_max_distance   : 10,
        doubletap_distance : 20,
        doubletap_interval : 300
    },
    handler: function tapGesture(type, ev, inst) {
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
    name: 'drag',
    index: 50,
    defaults: {
        drag_min_distance : 10,
        drag_max_touches  : 1   // set 0 for unlimited, but this can conflict with transform
    },
    handler: function dragGesture(type, ev, inst) {
        // max touches
        if(inst.options.drag_max_touches > 0 && ev.touches.length > inst.options.drag_max_touches) {
            return;
        }

        if(type == Hammer.TOUCH_MOVE){
            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(ev.distance < inst.options.drag_min_distance &&
                Hammer.gesture.current.name != this.name) {
                return;
            }

            Hammer.gesture.current.name = this.name;
            inst.trigger(this.name, ev); // basic drag event
            inst.trigger(this.name + ev.direction, ev);  // direction event, like dragdown
        }
    }
};


// Swipe gesture
// Called after Hammer.gesture.Drag
// events: swipe, swipeleft, swiperight, swipeup, swipedown
Hammer.gestures.Swipe = {
    name: 'swipe',
    index: 51,
    defaults: {
        swipe_min_time     : 150,
        swipe_min_distance : 20
    },
    handler: function swipeGesture(type, ev, inst) {
        if(type == Hammer.TOUCH_END) {
            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(Hammer.gesture.current.name == 'drag' &&
                ev.touchTime > inst.options.swipe_min_time &&
                ev.distance > inst.options.swipe_min_distance) {

                inst.trigger(this.name, ev); // basic drag event
                inst.trigger(this.name + ev.direction, ev);  // direction event, like dragdown
            }
        }
    }
};


// Pull page down gesture
// Used for Pull-to-Refresh gesture
// Called after Hammer.gesture.Drag
// events: pulldown
Hammer.gestures.PullDown = {
    name: 'pulldown',
    index: 52,
    handler: function pulldownGesture(type, ev, inst) {
        if(Hammer.gesture.current.name == 'drag' &&
            ev.direction == Hammer.DIRECTION_DOWN &&
            window.scrollY === 0) {
            inst.trigger(this.name, ev);
        }
    }
};


// Transform gesture
// Called before Hammer.gesture.Drag
// events: transformstart, transform, transformend,
//          pinch, pinchin, pinchout,
//          rotate, rotateleft, rotateright
Hammer.gestures.Transform = {
    name: 'transform',
    index: 45,
    defaults: {
        // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
        transform_min_scale     : 0.05,
        // rotation in degrees
        transform_min_rotation  : 5
    },
    handler: function transformGesture(type, ev, inst) {
        // at least multitouch
        if(type == Hammer.TOUCH_MOVE && ev.touches.length == 2) {
            var scale_threshold = Math.abs(1-ev.scale);
            var rotation_threshold = Math.abs(ev.rotation);

            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(scale_threshold < inst.options.transform_min_scale &&
                rotation_threshold < inst.options.transform_min_rotation) {
                return;
            }

            Hammer.gesture.current.name = this.name;
            inst.trigger(this.name, ev); // basic drag event

            // trigger rotate event
            if(rotation_threshold > inst.options.transform_min_rotation) {
                inst.trigger('rotate', ev);
            }

            // trigger pinch event
            if(scale_threshold > inst.options.transform_min_scale) {
                inst.trigger('pinch', ev);
                inst.trigger('pinch'+ ((ev.scale < 1) ? 'in' : 'out'), ev);  // direction event, like pinchin
            }
        }
    }
};


// Touch gesture
// Called as first, tells the user has touched the screen
// events: release
Hammer.gestures.Touch = {
    name: 'touch',
    index: -Infinity,
    handler: function touchGesture(type, ev, inst) {
        if(type ==  Hammer.TOUCH_START) {
            inst.trigger(this.name, ev);
        }
    }
};


// Release gesture
// Called as last, tells the user has released the screen
// events: release
Hammer.gestures.Release = {
    name: 'release',
    index: Infinity,
    handler: function releaseGesture(type, ev, inst) {
        if(type ==  Hammer.TOUCH_END) {
            inst.trigger(this.name, ev);
        }
    }
};

// Expose Hammer to the global object
window.Hammer = Hammer;

})(window);