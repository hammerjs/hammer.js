var Detection = Hammer.detection = {
  // contains all registred Hammer.gestures
  gestures: [],

  // when this becomes true, no gestures are fired
  stopped : false,

  /**
   * Hammer.gesture detection
   * @param   {Object}    eventData
   */
  detect: function detect(inst, ev) {

    if(this.stopped) {
      return;
    }

    // TODO: disabled with inst_options

    // call Hammer.gesture handlers
    Utils.each(inst.gestures, function triggerGesture(gesture) {
      // only when the instance options have enabled this gesture
      if(inst.enabled && gesture.enabled) {

        if(ev.eventType === EVENT_START ) {

          // start the gestureSession
          gesture.session = {
            startEvent        : Utils.extend({}, ev), // start eventData for distances, timing etc
            lastEvent         : false, // last eventData
            lastVelocityEvent : false, // last eventData for velocity.
            velocity          : false // current velocity
          };

        }

        // clone the event because each gesture can update its event data
        var eventData = Utils.extend({}, ev);
        eventData = Utils.extendEventData(eventData, gesture.session);

        // if a handler returns false, we stop with the detection
        if(gesture.handler.call(gesture, eventData, inst) === false) {
          //this.stopDetect();
          //return false;
        }
        gesture.session.lastEvent = eventData;
      }
    }, this);
    


  },


  /**
   * register new gesture
   * @param   {Object}    gesture object, see gestures.js for documentation
   * @returns {Array}     gestures
   */
  register: function register(gesture) {
    console.assert(typeof(gesture) === 'function', 'Breaking change: Define custom gestures as function object');
    this.gestures.push(gesture);
    return this.gestures;
  }
};
