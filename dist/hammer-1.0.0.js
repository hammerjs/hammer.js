window.Hammer = (function(hammer) {
    'use strict';

function hammer(el, options) {
    return new HammerInstance(el, options || {});
}


// default settings
hammer.defaults = {
    // more settings are defined at gestures.js
};


// detect touchevents
hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);


// direction defines
hammer.DIRECTION_DOWN = 'down';
hammer.DIRECTION_LEFT = 'left';
hammer.DIRECTION_UP = 'up';
hammer.DIRECTION_RIGHT = 'right';


// touch event defines
hammer.TOUCH_START = 'start';
hammer.TOUCH_MOVE = 'move';
hammer.TOUCH_END = 'end';

hammer.READY = false;


/**
 * setup events to detect gestures on the document
 * @return
 */
function setup() {
    if(hammer.READY) {
        return;
    }

    Event.onTouch(window, hammer.TOUCH_MOVE, Gesture.detect);
    Event.onTouch(window, hammer.TOUCH_END, Gesture.endDetect);

    // hammer is ready...
    hammer.READY = true;
}
function HammerInstance(el, options) {
    var self = this;

    this.element = el;
    this.options = Util.extend(hammer.defaults, options);

    // setup hammerJS window events
    setup();

    // start detection on touchstart
    Event.onTouch(el, hammer.TOUCH_START, function(ev) {
        Gesture.startDetect(self, ev);
    });
}


/**
 * trigger gesture event
 * @param   string      gesture
 * @param   object      ev
 * @return  {*}
 */
HammerInstance.prototype.trigger = function(gesture, ev) {
    ev.gesture = gesture;
    return Event.trigger(this.element, gesture, ev);
};

HammerInstance.prototype.on = function(gesture, callback) {
    return Event.on(this.element, gesture, callback);
};

HammerInstance.prototype.off = function(gesture, callback) {
    return Event.off(this.element, gesture, callback);
};
var Event = hammer.Event = {

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
     * @param   TOUCHTYPE       type        like hammer.TOUCH_MOVE
     * @param   callback
     */
    onTouch: function(element, type, callback) {
        var cb = function(ev) {
            callback.call(this, Event.collectEventData(element, type, ev));
        };

        var events = {};
        events[hammer.TOUCH_START]  = hammer.HAS_TOUCHEVENTS ? 'touchstart' : 'mousedown';
        events[hammer.TOUCH_MOVE]   = hammer.HAS_TOUCHEVENTS ? 'touchmove' : 'mousemove';
        events[hammer.TOUCH_END]    = hammer.HAS_TOUCHEVENTS ? 'touchend touchcancel' : 'mouseup';

        // touchdevice
        if(hammer.HAS_TOUCHEVENTS) {
            Event.on(element, events[type], cb);
        }
        // mouse
        else {
            Event.on(element, events[type], function(ev) {
                if(ev.which === 1) {
                    cb.apply(this, arguments);
                }
            });
        }
    },


    /**
     * collect event data for hammer js
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like hammer.TOUCH_MOVE
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
            center: Util.getCenter(touches)
        };
    }
};
var Util = hammer.Util = {

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
                return hammer[key];
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
            return Util.getDistance(end[0], end[1]) /
                Util.getDistance(start[0], start[1]);
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
            return Util.getAngle(end[1], end[0]) -
                Util.getAngle(start[1], start[0]);
        }
        return 0;
    }
};

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


var Gestures = hammer.Gestures = {};



// Hold gesture
// Touch stays at the same place for x time
// events: hold
Gestures.Hold = {
    priority: 10,
    defaults: {
        hold_timeout: 500
    },
    timer: null,
    handle: function(type, ev, inst) {
        switch(type) {
            case hammer.TOUCH_START:
                // clear any running timers
                clearTimeout(Gestures.Hold.timer);

                // set the gesture so we can check in the timeout if it still is
                Gesture.current.gesture = 'hold';

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                Gestures.Hold.timer = setTimeout(function() {
                    if(Gesture.current.gesture == 'hold') {
                        inst.trigger("hold", ev);
                    }
                }, inst.options.hold_timeout);
                break;

            // when you move or end we clear the timer
            case hammer.TOUCH_MOVE:
            case hammer.TOUCH_END:
                clearTimeout(Gestures.Hold.timer);
                break;
        }
    }
};
Gesture.registerGesture(Gestures.Hold);



// Tap/DoubleTap gesture
// Quick touch at a place or double at the same place
// events: tap, doubletap
Gestures.Tap = {
    priority: 100,
    defaults: {
        tap_max_touchtime  : 250,
        tap_max_distance   : 10,
        doubletap_distance : 20,
        doubletap_interval : 300
    },
    handle: function(type, ev, inst) {
        switch(type) {
            case hammer.TOUCH_END:
                // when the touchtime is higher then the max touch time
                // or when the moving distance is too much
                if(ev.touchTime > inst.options.tap_max_touchtime ||
                    ev.distance > inst.options.tap_max_distance) {
                    return;
                }

                // check if double tap
                if(Gesture.previous && Gesture.previous.gesture == 'tap' &&
                    (ev.time - Gesture.previous.lastEvent.time) < inst.options.doubletap_interval &&
                    ev.distance < inst.options.doubletap_distance)
                {
                    Gesture.current.gesture = 'doubletap';
                }
                else {
                    Gesture.current.gesture = 'tap';
                }

                inst.trigger(Gesture.current.gesture, ev);
                break;
        }
    }
};
Gesture.registerGesture(Gestures.Tap);



// Drag gesture
// Quick touch at a place or double at the same place
// events:  dragstart, drag, dragend,
//          drapleft, dragright, dragup, dragdown
Gestures.Drag = {
    priority: 50,
    defaults: {
        drag_min_distance : 10
    },
    handle: function(type, ev, inst) {
        var name = 'drag',
            first = false;

        switch(type) {
            case hammer.TOUCH_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(ev.distance < inst.options.drag_min_distance &&
                    Gesture.current.gesture != name) {
                    return;
                }

                // first time
                if(Gesture.current.gesture != name) {
                    inst.trigger('dragstart', ev);
                }

                Gesture.current.gesture = name;
                inst.trigger(name, ev); // basic drag event
                inst.trigger(name + ev.direction, ev);  // direction event, like dragdown

                // stop browser from scrolling
                ev.originalEvent.preventDefault();
                break;

            case hammer.TOUCH_END:
                if(Gesture.current.gesture == name) {
                    inst.trigger('dragend', ev);

                    // stop browser from scrolling
                    ev.originalEvent.preventDefault();
                }
                break;
        }
    }
};
Gesture.registerGesture(Gestures.Drag);



// Swipe gesture
// Called after Gesture.Drag
// events: swipe, swipeleft, swiperight, swipeup, swipedown
Gestures.Swipe = {
    priority: 51,
    defaults: {
        swipe_min_time     : 150,
        swipe_min_distance : 20
    },
    handle: function(type, ev, inst) {
        var name = 'swipe';

        switch(type) {
            case hammer.TOUCH_END:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(Gesture.current.gesture == 'drag' &&
                    ev.touchTime > inst.options.swipe_min_time &&
                    ev.distance > inst.options.swipe_min_distance) {

                    inst.trigger(name, ev); // basic drag event
                    inst.trigger(name + ev.direction, ev);  // direction event, like dragdown
                }
                break;
        }
    }
};
Gesture.registerGesture(Gestures.Swipe);



// Transform gesture
// Called before Gesture.Drag
// events: transformstart, transform, transformend,
//          pinch, pinchin, pinchout,
//          rotate, rotateleft, rotateright
Gestures.Transform = {
    priority: 45,
    defaults: {
        transform_min_scale     : .1,
        transform_min_rotation  : 15   // degrees
    },
    handle: function(type, ev, inst) {
        var name = 'transform',
            first = false;

        switch(type) {
            case hammer.TOUCH_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if((ev.scale < inst.options.transform_min_scale ||
                   ev.rotation < inst.options.transform_min_rotate) &&
                    Gesture.current.gesture != name) {
                    return;
                }

                // first time
                if(Gesture.current.gesture != name) {
                    inst.trigger('transformstart', ev);
                }

                Gesture.current.gesture = name;
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

            case hammer.TOUCH_END:
                if(Gesture.current.gesture == name) {
                    inst.trigger('transformend', ev);

                    // stop browser from scrolling
                    ev.originalEvent.preventDefault();
                }
                break;
        }
    }
};
Gesture.registerGesture(Gestures.Transform);



// Release gesture
// Called as last, tells the user has released the screen
// events: release
Gestures.Release = {
    priority: 999,
    handle: function(type, ev, inst) {
        switch(type) {
            case hammer.TOUCH_END:
                inst.trigger('release', ev);
                break;
        }
    }
};
Gesture.registerGesture(Gestures.Release);
    return hammer;
})();