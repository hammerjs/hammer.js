/**
 * @module gestures
 */
/**
 * when a touch is being touched at the page
 *
 * @class Touch
 * @static
 */
/**
 * @event touch
 * @param {Object} ev
 */
Hammer.gestures.Touch = {
  name: 'touch',
  index: -Infinity,
  defaults: {
    /**
     * call preventDefault at touchstart, and makes the element blocking by disabling the scrolling of the page,
     * but it improves gestures like transforming and dragging.
     * be careful with using this, it can be very annoying for users to be stuck on the page
     * @property prevent_default
     * @type {Boolean}
     * @default false
     */
    prevent_default: false,

    /**
     * disable mouse events, so only touch (or pen!) input triggers events
     * @property prevent_mouseevents
     * @type {Boolean}
     * @default false
     */
    prevent_mouseevents: false
  },
  handler: function touchGesture(ev, inst) {
    if(inst.options.prevent_mouseevents && ev.pointerType == POINTER_MOUSE) {
      ev.stopDetect();
      return;
    }

    if(inst.options.prevent_default) {
      ev.preventDefault();
    }

    if(ev.eventType == EVENT_TOUCH) {
      inst.trigger('touch', ev);
    }
  }
};