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