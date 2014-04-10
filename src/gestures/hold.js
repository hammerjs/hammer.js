/**
 * @module gestures
 */
/**
 * Touch stays at the same place for x time
 *
 * @class Hold
 * @static
 */
/**
 * @event hold
 * @param {Object} ev
 */
(function(name) {
  var timer;

  function holdGesture(ev, inst) {
    var options = inst.options
      , current = Detection.current;

    switch(ev.eventType) {
      case EVENT_START:
        clearTimeout(timer);

        // set the gesture so we can check in the timeout if it still is
        current.name = name;

        // set timer and if after the timeout it still is hold,
        // we trigger the hold event
        timer = setTimeout(function() {
          if(current && current.name == name) {
            inst.trigger(name, ev);
          }
        }, options.hold_timeout);
        break;

      case EVENT_MOVE:
        if(ev.distance > options.hold_threshold) {
          clearTimeout(timer);
        }
        break;

      case EVENT_RELEASE:
        clearTimeout(timer);
        break;
    }
  }

  Hammer.gestures.Hold = {
    name: name,
    index: 10,
    defaults: {
      /**
       * @property hold_timeout
       * @type {Number}
       * @default 500
       */
      hold_timeout: 500,

      /**
       * movement allowed while holding
       * @property hold_threshold
       * @type {Number}
       * @default 2
       */
      hold_threshold: 2
    },
    handler: holdGesture
  };
})('hold');