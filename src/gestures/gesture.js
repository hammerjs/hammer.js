/**
 * @module gestures
 */
/**
 * trigger a simple gesture event, so you can do anything in your handler.
 * only usable if you know what your doing...
 * 
 * @class Gesture
 * @static
 * 
 * @event gesture
 */
Hammer.gestures.Gesture = {
  name   : 'gesture',
  index  : 1337,
  defaults: {
    /**
     * trigger the event
     * @property gesture
     * @type {Boolean}
     * @default false
     */
    gesture: false
  },
  handler: function releaseGesture(ev, inst) {
    inst.trigger(this.name, ev);
  }
};