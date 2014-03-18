/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 * @param   {HTMLElement}       element
 * @param   {Object}            [options={}]
 * @returns {Hammer.Instance}
 * @constructor
 */
Hammer.Instance = function(element, options) {
  var self = this;

  // setup HammerJS window events and register all gestures
  // this also sets up the default options
  setup();

  this.element = element;

  // start/stop detection option
  this.enabled = true;

  // merge options
  this.options = Utils.extend(
    Utils.extend({}, Hammer.defaults),
    options || {});

  // add some css to the element to prevent the browser from doing its native behavoir
  if(this.options.stop_browser_behavior) {
    Utils.toggleDefaultBehavior(this.element, this.options.stop_browser_behavior, false);
  }

  // start detection on touchstart
  this.eventStartHandler = Event.onTouch(element, EVENT_START, function(ev) {
    if(self.enabled) {
      Detection.startDetect(self, ev);
    }
  });

  // keep a list of user event handlers which needs to be removed when calling 'dispose'
  this.eventHandlers = [];

  // return instance
  return this;
};


Hammer.Instance.prototype = {
  /**
   * bind events to the instance
   * @param   {String}      gesture
   * @param   {Function}    handler
   * @returns {Hammer.Instance}
   */
  on: function onEvent(gesture, handler) {
    var gestures = gesture.split(' ');
    Utils.each(gestures, function(gesture) {
      this.element.addEventListener(gesture, handler, false);
      this.eventHandlers.push({ gesture: gesture, handler: handler });
    }, this);
    return this;
  },


  /**
   * unbind events to the instance
   * @param   {String}      gesture
   * @param   {Function}    handler
   * @returns {Hammer.Instance}
   */
  off: function offEvent(gesture, handler) {
    var gestures = gesture.split(' ')
      , i, eh;
    Utils.each(gestures, function(gesture) {
      this.element.removeEventListener(gesture, handler, false);

      // remove the event handler from the internal list
      for(i=-1; (eh=this.eventHandlers[++i]);) {
        if(eh.gesture === gesture && eh.handler === handler) {
          this.eventHandlers.splice(i, 1);
        }
      }
    }, this);
    return this;
  },


  /**
   * trigger gesture event
   * @param   {String}      gesture
   * @param   {Object}      [eventData]
   * @returns {Hammer.Instance}
   */
  trigger: function triggerEvent(gesture, eventData) {
    // optional
    if(!eventData) {
      eventData = {};
    }

    // create DOM event
    var event = Hammer.DOCUMENT.createEvent('Event');
    event.initEvent(gesture, true, true);
    event.gesture = eventData;

    // trigger on the target if it is in the instance element,
    // this is for event delegation tricks
    var element = this.element;
    if(Utils.hasParent(eventData.target, element)) {
      element = eventData.target;
    }

    element.dispatchEvent(event);
    return this;
  },


  /**
   * enable of disable hammer.js detection
   * @param   {Boolean}   state
   * @returns {Hammer.Instance}
   */
  enable: function enable(state) {
    this.enabled = state;
    return this;
  },


  /**
   * dispose this hammer instance
   * @returns {Hammer.Instance}
   */
  dispose: function dispose() {
    var i, eh;

    // undo all changes made by stop_browser_behavior
    if(this.options.stop_browser_behavior) {
      Utils.toggleDefaultBehavior(this.element, this.options.stop_browser_behavior, true);
    }

    // unbind all custom event handlers
    for(i=-1; (eh=this.eventHandlers[++i]);) {
      this.element.removeEventListener(eh.gesture, eh.handler, false);
    }
    this.eventHandlers = [];

    // unbind the start event listener
    Event.unbindDom(this.element, Hammer.EVENT_TYPES[EVENT_START], this.eventStartHandler);

    return null;
  }
};
