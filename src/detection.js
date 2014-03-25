var Detection = Hammer.detection = {
  // contains all registred Hammer.gestures in the correct order
  gestures: [],

  // data of the current Hammer.gesture detection session
  current : null,

  // the previous Hammer.gesture session data
  // is a full clone of the previous gesture.current object
  previous: null,

  // when this becomes true, no gestures are fired
  stopped : false,


  /**
   * start Hammer.gesture detection
   * @param   {Hammer.Instance}   inst
   * @param   {Object}            eventData
   */
  startDetect: function startDetect(inst, eventData) {
    // already busy with a Hammer.gesture detection on an element
    if(this.current) {
      return;
    }

    this.stopped = false;

    // holds current session
    this.current = {
      inst              : inst, // reference to HammerInstance we're working for
      startEvent        : Utils.extend({}, eventData), // start eventData for distances, timing etc
      lastEvent         : false, // last eventData
      lastVelocityEvent : false, // last eventData for velocity.
      velocity          : false, // current velocity
      name              : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
    };

    this.detect(eventData);
  },


  /**
   * Hammer.gesture detection
   * @param   {Object}    eventData
   */
  detect: function detect(eventData) {
    if(!this.current || this.stopped) {
      return;
    }

    // extend event data with calculations about scale, distance etc
    eventData = this.extendEventData(eventData);

    // hammer instance and instance options
    var inst = this.current.inst,
        inst_options = inst.options;

    // call Hammer.gesture handlers
    Utils.each(this.gestures, function triggerGesture(gesture) {
      // only when the instance options have enabled this gesture
      if(!this.stopped && inst_options[gesture.name] !== false && inst.enabled !== false ) {
        // if a handler returns false, we stop with the detection
        if(gesture.handler.call(gesture, eventData, inst) === false) {
          this.stopDetect();
          return false;
        }
      }
    }, this);

    // store as previous event event
    if(this.current) {
      this.current.lastEvent = eventData;
    }

    // end event, but not the last touch, so dont stop
    if(eventData.eventType == EVENT_END && !eventData.touches.length - 1) {
      this.stopDetect();
    }

    return eventData;
  },


  /**
   * clear the Hammer.gesture vars
   * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
   * to stop other Hammer.gestures from being fired
   */
  stopDetect: function stopDetect() {
    // clone current data to the store as the previous gesture
    // used for the double tap gesture, since this is an other gesture detect session
    this.previous = Utils.extend({}, this.current);

    // reset the current
    this.current = null;

    // stopped!
    this.stopped = true;
  },


  /**
   * calculate velocity
   * @param   {Object}  ev
   * @param   {Number}  delta_time
   * @param   {Number}  delta_x
   * @param   {Number}  delta_y
   */
  getVelocityData: function getVelocityData(ev, delta_time, delta_x, delta_y) {
    var cur = this.current
      , velocityEv = cur.lastVelocityEvent
      , velocity = cur.velocity;

    // calculate velocity every x ms
    if (velocityEv && ev.timeStamp - velocityEv.timeStamp > Hammer.UPDATE_VELOCITY_INTERVAL) {
      velocity = Utils.getVelocity(ev.timeStamp - velocityEv.timeStamp,
                                   ev.center.clientX - velocityEv.center.clientX,
                                  ev.center.clientY - velocityEv.center.clientY);
      cur.lastVelocityEvent = ev;
    }
    else if(!cur.velocity) {
      velocity = Utils.getVelocity(delta_time, delta_x, delta_y);
      cur.lastVelocityEvent = ev;
    }

    cur.velocity = velocity;

    ev.velocityX = velocity.x;
    ev.velocityY = velocity.y;
  },


  /**
   * calculate interim angle and direction
   * @param   {Object}  ev
   */
  getInterimData: function getInterimData(ev) {
    var lastEvent = this.current.lastEvent
      , angle
      , direction;

    // end events (e.g. dragend) don't have useful values for interimDirection & interimAngle
    // because the previous event has exactly the same coordinates
    // so for end events, take the previous values of interimDirection & interimAngle
    // instead of recalculating them and getting a spurious '0'
    if(ev.eventType == EVENT_END) {
      angle = lastEvent && lastEvent.interimAngle;
      direction = lastEvent && lastEvent.interimDirection;
    }
    else {
      angle = lastEvent && Utils.getAngle(lastEvent.center, ev.center);
      direction = lastEvent && Utils.getDirection(lastEvent.center, ev.center);
    }

    ev.interimAngle = angle;
    ev.interimDirection = direction;
  },


  /**
   * extend eventData for Hammer.gestures
   * @param   {Object}   evData
   * @returns {Object}   evData
   */
  extendEventData: function extendEventData(ev) {
    var cur = this.current
      , startEv = cur.startEvent;

    // if the touches change, set the new touches over the startEvent touches
    // this because touchevents don't have all the touches on touchstart, or the
    // user must place his fingers at the EXACT same time on the screen, which is not realistic
    // but, sometimes it happens that both fingers are touching at the EXACT same time
    if(ev.touches.length != startEv.touches.length || ev.touches === startEv.touches) {
      // extend 1 level deep to get the touchlist with the touch objects
      startEv.touches = [];
      Utils.each(ev.touches, function(touch) {
        startEv.touches.push(Utils.extend({}, touch));
      });
    }

    var delta_time = ev.timeStamp - startEv.timeStamp
      , delta_x = ev.center.clientX - startEv.center.clientX
      , delta_y = ev.center.clientY - startEv.center.clientY;

    this.getVelocityData(ev, delta_time, delta_x, delta_y);
    this.getInterimData(ev);

    Utils.extend(ev, {
      startEvent: startEv,

      deltaTime : delta_time,
      deltaX    : delta_x,
      deltaY    : delta_y,

      distance  : Utils.getDistance(startEv.center, ev.center),
      angle     : Utils.getAngle(startEv.center, ev.center),
      direction : Utils.getDirection(startEv.center, ev.center),

      scale     : Utils.getScale(startEv.touches, ev.touches),
      rotation  : Utils.getRotation(startEv.touches, ev.touches)
    });

    return ev;
  },


  /**
   * register new gesture
   * @param   {Object}    gesture object, see gestures.js for documentation
   * @returns {Array}     gestures
   */
  register: function register(gesture) {
    // add an enable gesture options if there is no given
    var options = gesture.defaults || {};
    if(options[gesture.name] === undefined) {
      options[gesture.name] = true;
    }

    // extend Hammer default options with the Hammer.gesture options
    Utils.extend(Hammer.defaults, options, true);

    // set its index
    gesture.index = gesture.index || 1000;

    // add Hammer.gesture to the list
    this.gestures.push(gesture);

    // sort the list by index
    this.gestures.sort(function(a, b) {
      if(a.index < b.index) { return -1; }
      if(a.index > b.index) { return 1; }
      return 0;
    });

    return this.gestures;
  }
};
