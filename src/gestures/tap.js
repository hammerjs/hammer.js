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
(function(name) {
  var has_moved = false;

  function tapGesture(ev, inst) {
    var options = inst.options
      , current = Detection.current
      , prev = Detection.previous
      , since_prev
      , did_doubletap;

    switch(ev.eventType) {
      case EVENT_START:
        has_moved = false;
        break;

      case EVENT_MOVE:
        has_moved = has_moved || (ev.distance > options.tap_max_distance);
        break;

      case EVENT_END:
        if(ev.srcEvent.type != 'touchcancel' && ev.deltaTime < options.tap_max_touchtime && !has_moved) {
          // previous gesture, for the double tap since these are two different gesture detections
          since_prev = prev && prev.lastEvent && ev.timeStamp - prev.lastEvent.timeStamp;
          did_doubletap = false;

          // check if double tap
          if(prev && prev.name == name &&
              (since_prev && since_prev < options.doubletap_interval) &&
              ev.distance < options.doubletap_distance) {
            inst.trigger('doubletap', ev);
            did_doubletap = true;
          }

          // do a single tap
          if(!did_doubletap || options.tap_always) {
            current.name = name;
            inst.trigger(current.name, ev);
          }
        }
    }
  }

  Hammer.gestures.Tap = {
    name: name,
    index: 100,
    handler: tapGesture,
    defaults: {
      /**
       * max time of a tap, this is for the slow tappers
       * @property tap_max_touchtime
       * @type {Number}
       * @default 250
       */
      tap_max_touchtime: 250,

      /**
       * max distance of movement of a tap, this is for the slow tappers
       * @property tap_max_distance
       * @type {Number}
       * @default 10
       */
      tap_max_distance: 10,

      /**
       * always trigger the `tap` event, even while double-tapping
       * @property tap_always
       * @type {Boolean}
       * @default true
       */
      tap_always: true,

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
    }
  };
})('tap');