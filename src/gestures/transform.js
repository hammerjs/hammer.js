/**
 * @module gestures
 */
/**
 * User want to scale or rotate with 2 fingers
 * Preventing the default browser behavior is a good way to improve feel and working. This can be done with the
 * `transform_always_block` option.
 *
 * @class Transform
 * @static
 */
/**
 * @event transform
 * @param {Object} ev
 */
/**
 * @event transformstart
 * @param {Object} ev
 */
/**
 * @event transformend
 * @param {Object} ev
 */
/**
 * @event pinchin
 * @param {Object} ev
 */
/**
 * @event pinchout
 * @param {Object} ev
 */
/**
 * @event rotate
 * @param {Object} ev
 */
Hammer.gestures.Transform = {
  name     : 'transform',
  index    : 45,
  defaults : {
    /**
     * minimal scale factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
     * @property transform_min_scale
     * @type {Number}
     * @default 0.01
     */
    transform_min_scale: 0.01,

    /**
     * rotation in degrees
     * @property transform_min_rotation
     * @type {Number}
     * @default 1
     */
    transform_min_rotation: 1,

    /**
     * prevent default browser behavior when two touches are on the screen
     * but it makes the element a blocking element
     * when you are using the transform gesture, it is a good practice to set this true
     * @property transform_always_block
     * @type {Boolean}
     * @default false
     */
    transform_always_block: false,

    /**
     * checks if all touches occurred within the instance element
     * @property transform_within_instance
     * @type {Boolean}
     * @default false
     */
    transform_within_instance: false
  },

  triggered: false,

  handler  : function transformGesture(ev, inst) {
    // at least multitouch
    if(ev.touches.length < 2) {
      return;
    }

    // prevent default when two fingers are on the screen
    if(inst.options.transform_always_block) {
      ev.preventDefault();
    }

    // check if all touches occurred within the instance element
    if(inst.options.transform_within_instance) {
      for(var i=-1; ev.touches[++i];) {
        if(!Utils.hasParent(ev.touches[i].target, inst.element)) {
          return;
        }
      }
    }

    switch(ev.eventType) {
      case EVENT_START:
        this.triggered = false;
        break;

      case EVENT_MOVE:
        var scale_threshold = Math.abs(1 - ev.scale);
        var rotation_threshold = Math.abs(ev.rotation);

        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(scale_threshold < inst.options.transform_min_scale &&
          rotation_threshold < inst.options.transform_min_rotation) {
          return;
        }

        // we are transforming!
        Detection.current.name = this.name;

        // first time, trigger dragstart event
        if(!this.triggered) {
          inst.trigger(this.name + 'start', ev);
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
          inst.trigger('pinch' + (ev.scale<1 ? 'in' : 'out'), ev);
        }
        break;

      case EVENT_RELEASE:
        if(this.triggered && ev.changedLength < 2) {
          inst.trigger(this.name + 'end', ev);
          this.triggered = false;
        }
        break;
    }
  }
};