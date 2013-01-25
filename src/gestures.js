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