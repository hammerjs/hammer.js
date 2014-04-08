/**
 * @module gestures
 */
/**
 * Single tap and a double tap on a place
 *
 * @class Tap
 * @static
 */
/**
 * @event tap
 * @param {Object} ev
 */
/**
 * @event doubletap
 * @param {Object} ev
 */
Hammer.gestures.Tap = {
  name    : 'tap',
  index   : 100,
  defaults: {
    /**
     * max time of a tap, this is for the slow tappers
     * @property tap_max_touchtime
     * @type {Number}
     * @default 250
     */
    tap_max_touchtime : 250,

    /**
     * max distance of movement of a tap, this is for the slow tappers
     * @property tap_max_distance
     * @type {Number}
     * @default 10
     */
    tap_max_distance  : 10,

    /**
     * always trigger the `tap` event, even while double-tapping
     * @property tap_always
     * @type {Boolean}
     * @default true
     */
    tap_always        : true,

    /**
     * max distance between two taps
     * @property doubletap_distance
     * @type {Number}
     * @default 20
     */
    doubletap_distance: 20,

    /**
     * max time between two taps
     * @property doubletap_interval
     * @type {Number}
     * @default 300
     */
    doubletap_interval: 300
  },

  has_moved: false,

  handler : function tapGesture(ev, inst) {
    var prev, since_prev, did_doubletap;

    // reset moved state
    if(ev.eventType == EVENT_START) {
      this.has_moved = false;
    }

    // Track the distance we've moved. If it's above the max ONCE, remember that (fixes #406).
    else if(ev.eventType == EVENT_MOVE && !this.moved) {
      this.has_moved = (ev.distance > inst.options.tap_max_distance);
    }

    else if(ev.eventType == EVENT_END &&
        ev.srcEvent.type != 'touchcancel' &&
        ev.deltaTime < inst.options.tap_max_touchtime && !this.has_moved) {

      // previous gesture, for the double tap since these are two different gesture detections
      prev = Detection.previous;
      since_prev = prev && prev.lastEvent && ev.timeStamp - prev.lastEvent.timeStamp;
      did_doubletap = false;

      // check if double tap
      if(prev && prev.name == 'tap' &&
          (since_prev && since_prev < inst.options.doubletap_interval) &&
          ev.distance < inst.options.doubletap_distance) {
        inst.trigger('doubletap', ev);
        did_doubletap = true;
      }

      // do a single tap
      if(!did_doubletap || inst.options.tap_always) {
        Detection.current.name = 'tap';
        inst.trigger(Detection.current.name, ev);
      }
    }
  }
};