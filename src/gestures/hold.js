/**
 * @module gestures
 */
/**
 * Touch stays at the same place for x time
 * 
 * @class Hold
 * @static
 * 
 * @event hold
 */
Hammer.gestures.Hold = {
  name    : 'hold',
  index   : 10,
  defaults: {
    /**
     * @property hold_timeout
     * @type {Number}
     * @default 500
     */
    hold_timeout  : 500,
    
    /**
     * movement allowed while holding
     * @property hold_threshold
     * @type {Number}
     * @default 2
     */
    hold_threshold: 2
  },
  timer   : null,

  handler : function holdGesture(ev, inst) {
    switch(ev.eventType) {
      case EVENT_START:
        // clear any running timers
        clearTimeout(this.timer);

        // set the gesture so we can check in the timeout if it still is
        Detection.current.name = this.name;

        // set timer and if after the timeout it still is hold,
        // we trigger the hold event
        this.timer = setTimeout(function() {
          if(Detection.current && Detection.current.name == 'hold') {
            inst.trigger('hold', ev);
          }
        }, inst.options.hold_timeout);
        break;

      // when you move or end we clear the timer
      case EVENT_MOVE:
        if(ev.distance > inst.options.hold_threshold) {
          clearTimeout(this.timer);
        }
        break;

      case EVENT_RELEASE:
        clearTimeout(this.timer);
        break;
    }
  }
};