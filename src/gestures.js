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
 *
 *      @param  {Object}    eventData
 *      event data containing the following properties:
 *          timeStamp   {Number}        time the event occurred
 *          target      {HTMLElement}   target element
 *          touches     {Array}         touches (fingers, pointers, mouse) on the screen
 *          pointerType {String}        kind of pointer that was used. matches Hammer.POINTER_MOUSE|TOUCH
 *          center      {Object}        center position of the touches. contains pageX and pageY
 *          deltaTime   {Number}        the total time of the touches in the screen
 *          deltaX      {Number}        the delta on x axis we haved moved
 *          deltaY      {Number}        the delta on y axis we haved moved
 *          velocityX   {Number}        the velocity on the x
 *          velocityY   {Number}        the velocity on y
 *          angle       {Number}        the angle we are moving
 *          direction   {String}        the direction we are moving. matches Hammer.DIRECTION_UP|DOWN|LEFT|RIGHT
 *          distance    {Number}        the distance we haved moved
 *          scale       {Number}        scaling of the touches, needs 2 touches
 *          rotation    {Number}        rotation of the touches, needs 2 touches *
 *          eventType   {String}        matches Hammer.EVENT_START|MOVE|END
 *          srcEvent    {Object}        the source event, like TouchStart or MouseDown *
 *          startEvent  {Object}        contains the same properties as above,
 *                                      but from the first touch. this is used to calculate
 *                                      distances, deltaTime, scaling etc
 *
 *      @param  {Hammer.Instance}    inst
 *      the instance we are doing the detection for. you can get the options from
 *      the inst.options object and trigger the gesture event by calling inst.trigger
 *
 *
 * Handle gestures
 * --------------------
 * inside the handler you can get/set Hammer.detection.current. This is the current
 * detection session. It has the following properties
 *      @param  {String}    name
 *      contains the name of the gesture we have detected. it has not a real function,
 *      only to check in other gestures if something is detected.
 *      like in the drag gesture we set it to 'drag' and in the swipe gesture we can
 *      check if the current gesture is 'drag' by accessing Hammer.detection.current.name
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
 * the Hammer.detection.current object is copied into Hammer.detection.previous,
 * this is usefull for gestures like doubletap, where you need to know if the
 * previous gesture was a tap
 *
 * options that have been set by the instance can be received by calling inst.options
 *
 * You can trigger a gesture event by calling inst.trigger("mygesture", event).
 * The first param is the name of your gesture, the second the event argument
 *
 *
 * Register gestures
 * --------------------
 * When an gesture is added to the Hammer.gestures object, it is auto registered
 * at the setup of the first Hammer instance. You can also call Hammer.detection.register
 * manually and pass your gesture object as a param
 *
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
        hold_timeout	: 500,
        hold_threshold	: 1
    },
    timer: null,
    handler: function holdGesture(ev, inst) {
        switch(ev.eventType) {
            case Hammer.EVENT_START:
                // clear any running timers
                clearTimeout(this.timer);

                // set the gesture so we can check in the timeout if it still is
                Hammer.detection.current.name = this.name;

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                this.timer = setTimeout(function() {
                    if(Hammer.detection.current.name == 'hold') {
                        inst.trigger('hold', ev);
                    }
                }, inst.options.hold_timeout);
                break;

            // when you move or end we clear the timer
            case Hammer.EVENT_MOVE:
                if(ev.distance > inst.options.hold_threshold) {
                    clearTimeout(this.timer);
                }
                break;

            case Hammer.EVENT_END:
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
        tap_max_touchtime	: 250,
        tap_max_distance	: 10,
		tap_always			: true,
        doubletap_distance	: 20,
        doubletap_interval	: 300
    },
    handler: function tapGesture(ev, inst) {
        if(ev.eventType == Hammer.EVENT_END && ev.srcEvent.type != 'touchcancel') {
            // previous gesture, for the double tap since these are two different gesture detections
            var prev = Hammer.detection.previous,
				did_doubletap = false;

            // when the touchtime is higher then the max touch time
            // or when the moving distance is too much
            if(ev.deltaTime > inst.options.tap_max_touchtime ||
                ev.distance > inst.options.tap_max_distance) {
                return;
            }

            // check if double tap
            if(prev && prev.name == 'tap' &&
                (ev.timeStamp - prev.lastEvent.timeStamp) < inst.options.doubletap_interval &&
                ev.distance < inst.options.doubletap_distance) {
				inst.trigger('doubletap', ev);
				did_doubletap = true;
            }

			// do a single tap
			if(!did_doubletap || inst.options.tap_always) {
				Hammer.detection.current.name = 'tap';
				inst.trigger(Hammer.detection.current.name, ev);
			}
        }
    }
};


/**
 * Swipe
 * triggers swipe events when the end velocity is above the threshold
 * @events  swipe, swipeleft, swiperight, swipeup, swipedown
 */
Hammer.gestures.Swipe = {
    name: 'swipe',
    index: 40,
    defaults: {
        // set 0 for unlimited, but this can conflict with transform
        swipe_min_touches  : 1,
        swipe_max_touches  : 1,
        swipe_velocity     : 0.7
    },
    handler: function swipeGesture(ev, inst) {
        if(ev.eventType == Hammer.EVENT_END) {
            // max touches
            if(inst.options.swipe_max_touches > 0 &&
                ev.touches.length < inst.options.swipe_min_touches &&
                ev.touches.length > inst.options.swipe_max_touches) {
                return;
            }

            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(ev.velocityX > inst.options.swipe_velocity ||
                ev.velocityY > inst.options.swipe_velocity) {
                // trigger swipe events
                inst.trigger(this.name, ev);
                inst.trigger(this.name + ev.direction, ev);
            }
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
        // Set correct_for_drag_min_distance to true to make the starting point of the drag
        // be calculated from where the drag was triggered, not from where the touch started.
        // Useful to avoid a jerk-starting drag, which can make fine-adjustments
        // through dragging difficult, and be visually unappealing.
        correct_for_drag_min_distance : true,
        // set 0 for unlimited, but this can conflict with transform
        drag_max_touches  : 1,
        // prevent default browser behavior when dragging occurs
        // be careful with it, it makes the element a blocking element
        // when you are using the drag gesture, it is a good practice to set this true
        drag_block_horizontal   : false,
        drag_block_vertical     : false,
        // drag_lock_to_axis keeps the drag gesture on the axis that it started on,
        // It disallows vertical directions if the initial direction was horizontal, and vice versa.
        drag_lock_to_axis       : false,
        // drag lock only kicks in when distance > drag_lock_min_distance
        // This way, locking occurs only when the distance has become large enough to reliably determine the direction
        drag_lock_min_distance : 25
    },
    triggered: false,
    handler: function dragGesture(ev, inst) {
        // current gesture isnt drag, but dragged is true
        // this means an other gesture is busy. now call dragend
        if(Hammer.detection.current.name != this.name && this.triggered) {
            inst.trigger(this.name +'end', ev);
            this.triggered = false;
            return;
        }

        // max touches
        if(inst.options.drag_max_touches > 0 &&
            ev.touches.length > inst.options.drag_max_touches) {
            return;
        }

        switch(ev.eventType) {
            case Hammer.EVENT_START:
                this.triggered = false;
                break;

            case Hammer.EVENT_MOVE:
                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(ev.distance < inst.options.drag_min_distance &&
                    Hammer.detection.current.name != this.name) {
                    return;
                }

                // we are dragging!
                if(Hammer.detection.current.name != this.name) {
                    Hammer.detection.current.name = this.name;
                    if (inst.options.correct_for_drag_min_distance && ev.distance > 0) {
                        // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
                        // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
                        // It might be useful to save the original start point somewhere
                        var factor = Math.abs(inst.options.drag_min_distance/ev.distance);
                        Hammer.detection.current.startEvent.center.pageX += ev.deltaX * factor;
                        Hammer.detection.current.startEvent.center.pageY += ev.deltaY * factor;

                        // recalculate event data using new start point
                        ev = Hammer.detection.extendEventData(ev);
                    }
                }

                // lock drag to axis?
                if(Hammer.detection.current.lastEvent.drag_locked_to_axis || (inst.options.drag_lock_to_axis && inst.options.drag_lock_min_distance<=ev.distance)) {
                    ev.drag_locked_to_axis = true;
                }
                var last_direction = Hammer.detection.current.lastEvent.direction;
                if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
                    // keep direction on the axis that the drag gesture started on
                    if(Hammer.utils.isVertical(last_direction)) {
                        ev.direction = (ev.deltaY < 0) ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
                    }
                    else {
                        ev.direction = (ev.deltaX < 0) ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
                    }
                }

                // first time, trigger dragstart event
                if(!this.triggered) {
                    inst.trigger(this.name +'start', ev);
                    this.triggered = true;
                }

                // trigger normal event
                inst.trigger(this.name, ev);

                // direction event, like dragdown
                inst.trigger(this.name + ev.direction, ev);

                // block the browser events
                if( (inst.options.drag_block_vertical && Hammer.utils.isVertical(ev.direction)) ||
                    (inst.options.drag_block_horizontal && !Hammer.utils.isVertical(ev.direction))) {
                    ev.preventDefault();
                }
                break;

            case Hammer.EVENT_END:
                // trigger dragend
                if(this.triggered) {
                    inst.trigger(this.name +'end', ev);
                }

                this.triggered = false;
                break;
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
        transform_min_rotation  : 1,
        // prevent default browser behavior when two touches are on the screen
        // but it makes the element a blocking element
        // when you are using the transform gesture, it is a good practice to set this true
        transform_always_block  : false
    },
    triggered: false,
    handler: function transformGesture(ev, inst) {
        // current gesture isnt drag, but dragged is true
        // this means an other gesture is busy. now call dragend
        if(Hammer.detection.current.name != this.name && this.triggered) {
            inst.trigger(this.name +'end', ev);
            this.triggered = false;
            return;
        }

        // atleast multitouch
        if(ev.touches.length < 2) {
            return;
        }

        // prevent default when two fingers are on the screen
        if(inst.options.transform_always_block) {
            ev.preventDefault();
        }

        switch(ev.eventType) {
            case Hammer.EVENT_START:
                this.triggered = false;
                break;

            case Hammer.EVENT_MOVE:
                var scale_threshold = Math.abs(1-ev.scale);
                var rotation_threshold = Math.abs(ev.rotation);

                // when the distance we moved is too small we skip this gesture
                // or we can be already in dragging
                if(scale_threshold < inst.options.transform_min_scale &&
                    rotation_threshold < inst.options.transform_min_rotation) {
                    return;
                }

                // we are transforming!
                Hammer.detection.current.name = this.name;

                // first time, trigger dragstart event
                if(!this.triggered) {
                    inst.trigger(this.name +'start', ev);
                    this.triggered = true;
                }

                inst.trigger(this.name, ev); // basic transform event

                // trigger rotate event
                if(rotation_threshold > inst.options.transform_min_rotation) {
                    inst.trigger('rotate', ev);
                }

                // trigger pinch event
                if(scale_threshold > inst.options.transform_min_scale) {
                    inst.trigger('pinch', ev);
                    inst.trigger('pinch'+ ((ev.scale < 1) ? 'in' : 'out'), ev);
                }
                break;

            case Hammer.EVENT_END:
                // trigger dragend
                if(this.triggered) {
                    inst.trigger(this.name +'end', ev);
                }

                this.triggered = false;
                break;
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
    defaults: {
        // call preventDefault at touchstart, and makes the element blocking by
        // disabling the scrolling of the page, but it improves gestures like
        // transforming and dragging.
        // be careful with using this, it can be very annoying for users to be stuck
        // on the page
        prevent_default: false,

        // disable mouse events, so only touch (or pen!) input triggers events
        prevent_mouseevents: false
    },
    handler: function touchGesture(ev, inst) {
        if(inst.options.prevent_mouseevents && ev.pointerType == Hammer.POINTER_MOUSE) {
            ev.stopDetect();
            return;
        }

        if(inst.options.prevent_default) {
            ev.preventDefault();
        }

        if(ev.eventType ==  Hammer.EVENT_START) {
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
    handler: function releaseGesture(ev, inst) {
        if(ev.eventType ==  Hammer.EVENT_END) {
            inst.trigger(this.name, ev);
        }
    }
};
