var Gestures = {};

// Hold gesture
// Touch stays at the same place for x time
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