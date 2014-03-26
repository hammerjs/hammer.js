/**
 * Hold
 * Touch stays at the same place for x time
 * @events  hold
 */

Hammer.gestures.Hold = function() {
  
};
Hammer.gestures.Hold.prototype = {
  name    : 'hold',
  index   : 10,
  defaults: {
    hold_timeout  : 500,
    hold_threshold: 1
  },
  timer   : null,

  handler : function holdGesture(ev, inst) {
    switch(ev.eventType) {
      case EVENT_START:
        // clear any running timers
        clearTimeout(this.timer);

        // set timer and if after the timeout it still is hold,
        // we trigger the hold event
        this.timer = setTimeout(function() {
           inst.trigger('hold', ev);
        }, inst.options.hold_timeout);
        break;

      // when you move or end we clear the timer
      case EVENT_MOVE:
        if(ev.distance > inst.options.hold_threshold) {
          clearTimeout(this.timer);
        }
        break;

      case EVENT_END:
        clearTimeout(this.timer);
        break;
    }
  }
};
