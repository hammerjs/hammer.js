/**
 * @module gestures
 */
/**
 * triggers swipe events when the end velocity is above the threshold
 * for best usage, set `prevent_default` (on the drag gesture) to `true`
 * ````
 *  hammertime.on("dragleft swipeleft", function(ev) {
 *    console.log(ev);
 *    ev.gesture.preventDefault();
 *  });
 * ````
 *
 * @class Swipe
 * @static
 */
/**
 * @event swipe
 * @param {Object} ev
 */
/**
 * @event swipeleft
 * @param {Object} ev
 */
/**
 * @event swiperight
 * @param {Object} ev
 */
/**
 * @event swipeup
 * @param {Object} ev
 */
/**
 * @event swipedown
 * @param {Object} ev
 */
Hammer.gestures.Swipe = {
  name: 'swipe',
  index: 40,
  defaults: {
    /**
     * @property swipe_min_touches
     * @type {Number}
     * @default 1
     */
    swipe_min_touches: 1,

    /**
     * @property swipe_max_touches
     * @type {Number}
     * @default 1
     */
    swipe_max_touches: 1,

    /**
     * horizontal swipe velocity
     * @property swipe_velocity_x
     * @type {Number}
     * @default 0.7
     */
    swipe_velocity_x: 0.7,

    /**
     * vertical swipe velocity
     * @property swipe_velocity_y
     * @type {Number}
     * @default 0.6
     */
    swipe_velocity_y: 0.6
  },

  handler: function swipeGesture(ev, inst) {
    if(ev.eventType == EVENT_RELEASE) {
      var touches = ev.touches.length
        , options = inst.options;

      // max touches
      if(touches < options.swipe_min_touches ||
        touches > options.swipe_max_touches) {
        return;
      }

      // when the distance we moved is too small we skip this gesture
      // or we can be already in dragging
      if(ev.velocityX > options.swipe_velocity_x ||
        ev.velocityY > options.swipe_velocity_y) {
        // trigger swipe events
        inst.trigger(this.name, ev);
        inst.trigger(this.name + ev.direction, ev);
      }
    }
  }
};