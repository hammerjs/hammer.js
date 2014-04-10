/**
 * @module gestures
 */
/**
 * Move with x fingers (default 1) around on the page.
 * Preventing the default browser behavior is a good way to improve feel and working.
 * ````
 *  hammertime.on("drag", function(ev) {
 *    console.log(ev);
 *    ev.gesture.preventDefault();
 *  });
 * ````
 *
 * @class Drag
 * @static
 */
/**
 * @event drag
 * @param {Object} ev
 */
/**
 * @event dragstart
 * @param {Object} ev
 */
/**
 * @event dragend
 * @param {Object} ev
 */
/**
 * @event drapleft
 * @param {Object} ev
 */
/**
 * @event dragright
 * @param {Object} ev
 */
/**
 * @event dragup
 * @param {Object} ev
 */
/**
 * @event dragdown
 * @param {Object} ev
 */
(function(name) {
  var triggered = false;

  function dragGesture(ev, inst) {
    var cur = Detection.current;

    // max touches
    if(inst.options.drag_max_touches > 0 &&
      ev.touches.length > inst.options.drag_max_touches) {
      return;
    }

    switch(ev.eventType) {
      case EVENT_START:
        triggered = false;
        break;

      case EVENT_MOVE:
        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(ev.distance < inst.options.drag_min_distance &&
          cur.name != name) {
          return;
        }

        var startCenter = cur.startEvent.center;

        // we are dragging!
        if(cur.name != name) {
          cur.name = name;
          if(inst.options.correct_for_drag_min_distance && ev.distance > 0) {
            // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
            // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
            // It might be useful to save the original start point somewhere
            var factor = Math.abs(inst.options.drag_min_distance / ev.distance);
            startCenter.pageX += ev.deltaX * factor;
            startCenter.pageY += ev.deltaY * factor;
            startCenter.clientX += ev.deltaX * factor;
            startCenter.clientY += ev.deltaY * factor;

            // recalculate event data using new start point
            ev = Detection.extendEventData(ev);
          }
        }

        // lock drag to axis?
        if(cur.lastEvent.drag_locked_to_axis ||
            ( inst.options.drag_lock_to_axis &&
              inst.options.drag_lock_min_distance <= ev.distance
            )) {
          ev.drag_locked_to_axis = true;
        }
        var last_direction = cur.lastEvent.direction;
        if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
          // keep direction on the axis that the drag gesture started on
          if(Utils.isVertical(last_direction)) {
            ev.direction = (ev.deltaY < 0) ? DIRECTION_UP : DIRECTION_DOWN;
          }
          else {
            ev.direction = (ev.deltaX < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
          }
        }

        // first time, trigger dragstart event
        if(!triggered) {
          inst.trigger(name + 'start', ev);
          triggered = true;
        }

        // trigger events
        inst.trigger(name, ev);
        inst.trigger(name + ev.direction, ev);

        var is_vertical = Utils.isVertical(ev.direction);

        // block the browser events
        if((inst.options.drag_block_vertical && is_vertical) ||
          (inst.options.drag_block_horizontal && !is_vertical)) {
          ev.preventDefault();
        }
        break;

      case EVENT_RELEASE:
        if(triggered && ev.changedLength <= inst.options.drag_max_touches) {
          inst.trigger(name + 'end', ev);
          triggered = false;
        }
        break;

      case EVENT_END:
        triggered = false;
        break;
    }
  }


  Hammer.gestures.Drag = {
    name: name,
    index: 50,
    handler: dragGesture,
    defaults: {
      /**
       * minimal movement that have to be made before the drag event gets triggered
       * @property drag_min_distance
       * @type {Number}
       * @default 10
       */
      drag_min_distance: 10,

      /**
       * Set correct_for_drag_min_distance to true to make the starting point of the drag
       * be calculated from where the drag was triggered, not from where the touch started.
       * Useful to avoid a jerk-starting drag, which can make fine-adjustments
       * through dragging difficult, and be visually unappealing.
       * @property correct_for_drag_min_distance
       * @type {Boolean}
       * @default true
       */
      correct_for_drag_min_distance: true,

      /**
       * set 0 for unlimited, but this can conflict with transform
       * @property drag_max_touches
       * @type {Number}
       * @default 1
       */
      drag_max_touches: 1,

      /**
       * prevent default browser behavior when dragging occurs
       * be careful with it, it makes the element a blocking element
       * when you are using the drag gesture, it is a good practice to set this true
       * @property drag_block_horizontal
       * @type {Boolean}
       * @default false
       */
      drag_block_horizontal: false,

      /**
       * same as `drag_block_horizontal`, but for vertical movement
       * @property drag_block_vertical
       * @type {Boolean}
       * @default false
       */
      drag_block_vertical: false,

      /**
       * drag_lock_to_axis keeps the drag gesture on the axis that it started on,
       * It disallows vertical directions if the initial direction was horizontal, and vice versa.
       * @property drag_lock_to_axis
       * @type {Boolean}
       * @default false
       */
      drag_lock_to_axis: false,

      /**
       *  drag lock only kicks in when distance > drag_lock_min_distance
       * This way, locking occurs only when the distance has become large enough to reliably determine the direction
       * @property drag_lock_min_distance
       * @type {Number}
       * @default 25
       */
      drag_lock_min_distance: 25
    }
  };
})('drag');