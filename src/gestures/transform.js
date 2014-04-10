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
(function(name) {
  var triggered = false;

  function transformGesture(ev, inst) {
    switch(ev.eventType) {
      case EVENT_START:
        triggered = false;
        break;

      case EVENT_MOVE:
          // at least multitouch
        if(ev.touches.length < 2) {
          return;
        }

        var scale_threshold = Math.abs(1 - ev.scale);
        var rotation_threshold = Math.abs(ev.rotation);

        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(scale_threshold < inst.options.transform_min_scale &&
          rotation_threshold < inst.options.transform_min_rotation) {
          return;
        }

        // we are transforming!
        Detection.current.name = name;

        // first time, trigger dragstart event
        if(!triggered) {
          inst.trigger(name + 'start', ev);
          triggered = true;
        }

        inst.trigger(name, ev); // basic transform event

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
        if(triggered && ev.changedLength < 2) {
          inst.trigger(name + 'end', ev);
          triggered = false;
        }
        break;
    }
  }

  Hammer.gestures.Transform = {
    name     : name,
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
      transform_min_rotation: 1
    },

    handler: transformGesture
  };
})('transform');