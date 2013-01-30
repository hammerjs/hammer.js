/*! Hammer.JS - v1.0.0dev - 2013-01-30
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
    stop_browser_behavior: true,
    stop_browser_behavior_props: {
        "userSelect": "none",
        "touchCallout": "none",
        "touchAction": "none",
        "contentZooming": "none",
        "userDrag": "none",
        "tapHighlightColor": "rgba(0,0,0,0)"
    }

    // more settings are defined at gestures.js
};

// detect touchevents
Hammer.HAS_POINTEREVENTS = window.navigator.msPointerEnabled;
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
    Hammer.event.onTouch(document.body, Hammer.TOUCH_MOVE, Hammer.gesture.detect);
    Hammer.event.onTouch(document.body, Hammer.TOUCH_END, Hammer.gesture.endDetect);

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
    this._events = {};

    // merge options
    this.options = Hammer.util.extend(
        Hammer.util.extend({}, Hammer.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
        Hammer.util.stopBrowserBehavior(this);
    }

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        return Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    /**
     * these event methods are based on MicroEvent
     * the on, off and trigger event are only used by the inst
     * https://github.com/jeromeetienne/microevent.js
     *
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function onEvent(gestures, handler){
        var ev, t;
        gestures = gestures.split(" ");
        for(t=0; t<gestures.length; t++) {
            ev = gestures[t];
            this._events[ev] = this._events[ev]	|| [];
            this._events[ev].push(handler);
        }
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function offEvent(gestures, handler){
        var ev, t;
        gestures = gestures.split(" ");
        for(t=0; t<gestures.length; t++) {
            ev = gestures[t];
            if(ev in this._events === false) {
                return;
            }
            this._events[ev].splice(this._events[ev].indexOf(handler), 1);
        }
    },

    /**
     * trigger gesture event
     * @param   string      type
     * @param   object      ev
     * @return  {*}
     */
    trigger: function triggerEvent(gesture, data){
        data.gesture = gesture;

        if(gesture in this._events === false) {
            return;
        }
        for(var i = 0; i < this._events[gesture].length; i++){
            this._events[gesture][i].call(this, data);
        }
    }
};

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
    },


    /**
     * stop browser default behavior with css props
     * @param   Hammer.Instance inst
     * @return {*}
     */
    stopBrowserBehavior: function stopBrowserBehavior(inst) {
        var prop,
            vendors = ['webkit','moz','o',''],
            css_props = inst.options.stop_browser_behavior_props;

        for(var i = 0; i < vendors.length; i++) {
            for(var p in css_props) {
                if(css_props.hasOwnProperty(p)) {
                    prop = p;
                    if(vendors[i]) {
                        prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }
                    inst.element.style[prop] = css_props[p];
                }
            }
        }
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

        return self.detect(ev);
    },


    /**
     * Hammer.gesture detection
     * @param   Event           ev
     */
    detect: function detect(ev) {
        var self = Hammer.gesture,
            retval;

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
                    retval = gesture.handler.call(gesture, eventData.type, eventData, self.current.inst);
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

/**
 * Custom gestures
 * ==============================
 *
 * Gesture object
 * --------------------
 * The object structure of a gesture:
 *
 * { name: 'mygesture',
 *   index: 1337,
 *   defaults: {
 *     mygesture_option: true
 *   }
 *   handler: function(type, ev, inst) {
 *     // trigger gesture event
 *     inst.trigger(this.name, ev);
 *   }
 * }

 * @param   {String}    name
 * this should be the name of the gesture, lowercase
 * it is also being used to disable/enable the gesture per instance config.
 *
 * @param   {Number}    [index=1000]
 * the index of the gesture, where it is going to be in the stack of gestures detection
 * like when you build an gesture that depends on the drag gesture, it is a good
 * idea to place it after the index of the drag gesture.
 *
 * @param   {Object}    [defaults={}]
 * the default settings of the gesture. these are added to the instance settings,
 * and can be overruled per instance. you can also add the name of the gesture,
 * but this is also added by default (and set to true).
 *
 * @param   {Function}  handler
 * this handles the gesture detection of your custom gesture and receives the
 * following arguments:
 *      @param  {String}    type
 *      matches Hammer.TOUCH_START|MOVE|END
 *
 *      @param  {Object}    event
 *      event data containing the following properties:
 *          time        {Number}        time the event occurred
 *          target      {HTMLElement}   target element
 *          touches     {Array}         touches (fingers, pointers, mouse) on the screen
 *          center      {Object}        center position of the touches
 *                                      contains pageX and pageY
 *          touchTime   {Number}        the total time of the touches in the screen
 *          angle       {Number}        the angle we are moving
 *          direction   {String}        the direction we are moving.
 *                                      matches Hammer.DIRECTION_UP|DOWN|LEFT|RIGHT
 *          distance    {Number}        the distance we haved moved
 *          distanceX   {Number}        the distance on x axis we haved moved
 *          distanceY   {Number}        the distance on y axis we haved moved
 *          scale       {Number}        scaling of the touches, needs 2 touches
 *          rotation    {Number}        rotation of the touches, needs 2 touches
 *          srcEvent    {Object}        the source event, like TouchStart or MouseDown *
 *          startEvent  {Object}        contains the same properties as above,
 *                                      but from the first touch. this is used to calculate
 *                                      distances, touchTime, scaling etc
 *
 *      @param  {Hammer.Instance}    inst
 *      the instance we are doing the detection for. you can get the options from
 *      the inst.options object and trigger the gesture event by calling inst.trigger
 *
 *
 * Handle gestures
 * --------------------
 * inside the handler you can get/set Hammer.gesture.current. This is the current
 * detection session. It has the following properties
 *      @param  {String}    name
 *      contains the name of the gesture we have detected. it has not a real function,
 *      only to check in other gestures if something is detected.
 *      like in the drag gesture we set it to 'drag' and in the swipe gesture we can
 *      check if the current gesture is 'drag' by accessing Hammer.gesture.current.name
 *
 *      @readonly
 *      @param  {Hammer.Instance}    inst
 *      the instance we do the detection for
 *
 *      @readonly
 *      @param  {Object}    startEvent
 *      contains the properties of the first gesture detection in this session.
 *      Used for calculations about timing, distance, etc.
 *
 *      @readonly
 *      @param  {Object}    lastEvent
 *      contains all the properties of the last gesture detect in this session.
 *
 * after the gesture detection session has been completed (user has released the screen)
 * the Hammer.gesture.current object is copied into Hammer.gesture.previous,
 * this is usefull for gestures like doubletap, where you need to know if the previous
 * gesture was a tap
 *
 * options that have been set by the instance can be received by calling inst.options
 *
 * You can trigger a gesture event by calling inst.trigger("mygesture", event).
 * The first param is the name of your gesture, the second the event argument
 */

/**
 * Hold
 * Touch stays at the same place for x time
 * @events  hold
 */
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
                var self = this;
                // clear any running timers
                clearTimeout(this.timer);

                // set the gesture so we can check in the timeout if it still is
                Hammer.gesture.current.name = this.name;

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                this.timer = setTimeout(function() {
                    if(Hammer.gesture.current.name == self.name) {
                        inst.trigger(self.name, ev);
                    }
                }, inst.options.hold_timeout);
                break;

            // when you move or end we clear the timer
            case Hammer.TOUCH_MOVE:
            case Hammer.TOUCH_END:
                clearTimeout(this.timer);
                break;
        }
    }
};


/**
 * Tap/DoubleTap
 * Quick touch at a place or double at the same place
 * @events  tap, doubletap
 */
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


/**
 * Drag
 * Move with x fingers (default 1) around on the page. Blocking the scrolling when
 * moving left and right is a good practice. When all the drag events are blocking
 * you disable scrolling on that area.
 * @events  drag, drapleft, dragright, dragup, dragdown
 */
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


/**
 * Swipe
 * called after dragging ends and the user moved for x ms a small distance
 * @events  swipe, swipeleft, swiperight, swipeup, swipedown
 */
Hammer.gestures.Swipe = {
    name: 'swipe',
    index: 51,
    defaults: {
        swipe_min_time     : 150,
        swipe_max_time     : 500,
        swipe_min_distance : 20
    },
    handler: function swipeGesture(type, ev, inst) {
        if(type == Hammer.TOUCH_END) {
            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(Hammer.gesture.current.name == 'drag' &&
                ev.touchTime > inst.options.swipe_min_time &&
                ev.touchTime < inst.options.swipe_max_time &&
                ev.distance > inst.options.swipe_min_distance) {
                // trigger swipe events
                inst.trigger(this.name, ev);
                inst.trigger(this.name + ev.direction, ev);
            }
        }
    }
};


/**
 * Pull page down
 * Used for Pull-to-Refresh gestures
 * Called after Hammer.gesture.Drag
 * @events  pulldown
 */
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


/**
 * Transform
 * User want to scale or rotate with 2 fingers
 * @events  transform, pinch, pinchin, pinchout, rotate
 */
Hammer.gestures.Transform = {
    name: 'transform',
    index: 45,
    defaults: {
        // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
        transform_min_scale     : 0.01,
        // rotation in degrees
        transform_min_rotation  : 1
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


/**
 * Touch
 * Called as first, tells the user has touched the screen
 * @events  touch
 */
Hammer.gestures.Touch = {
    name: 'touch',
    index: -Infinity,
    handler: function touchGesture(type, ev, inst) {
        if(type ==  Hammer.TOUCH_START) {
            inst.trigger(this.name, ev);
        }
    }
};


/**
 * Release
 * Called as last, tells the user has released the screen
 * @events  release
 */
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