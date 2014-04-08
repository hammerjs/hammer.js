/*! Hammer.JS - v1.1.0dev - 2014-04-08
 * http://eightmedia.github.io/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window, undefined) {
  'use strict';

/**
 * @main
 * @module hammer
 *
 * @class Hammer
 * @static
 */

/**
 * Hammer, use this to create instances
 * ````
 * var hammertime = new Hammer(myElement);
 * ````
 *
 * @method Hammer
 * @param {HTMLElement} element
 * @param {Object} [options={}]
 * @return {Hammer.Instance}
 */
var Hammer = function Hammer(element, options) {
  return new Hammer.Instance(element, options || {});
};


/**
 * version, as defined in package.json
 * the value will be set at each build
 * @property VERSION
 * @final
 * @type {String}
 */
Hammer.VERSION = '1.1.0dev';


/**
 * if the window events are set...
 * @property READY
 * @writeOnce
 * @type {Boolean}
 * @default false
 */
Hammer.READY = false;


/**
 * default settings.
 * more settings are defined per gesture at `/gestures`
 * @property defaults
 * @type {Object}
 */
Hammer.defaults = {
  // stop_browser_behavior adds styles and attributes to the element to prevent the browser from doing
  // its native behavior. this doesnt prevent the scrolling, but cancelsthe contextmenu, tap highlighting etc
  // set to false to disable this
  stop_browser_behavior: {
    // this also triggers onselectstart=false for IE
    userSelect       : 'none',
    // this makes the element blocking in IE10>, you could experiment with the value
    // it doesnt block on the y-axis, change this to support vertical touches on IE10>
    // see for more options this issue; https://github.com/EightMedia/hammer.js/issues/241
    touchAction      : 'pan-x pinch-zoom double-tap-zoom',
    // properties, mainly for ios/android
    touchCallout     : 'none',
    contentZooming   : 'none',
    userDrag         : 'none',
    tapHighlightColor: 'rgba(0,0,0,0)'
  }
};


/**
 * hammer document where the base events are added at
 * @property DOCUMENT
 * @type {HTMLElement}
 * @default window.document
 */
Hammer.DOCUMENT = window.document;


/**
 * detect support for pointer events
 * @property HAS_POINTEREVENTS
 * @type {Boolean}
 */
Hammer.HAS_POINTEREVENTS = window.navigator.pointerEnabled || window.navigator.msPointerEnabled;


/**
 * detect support for touch events
 * @property HAS_TOUCHEVENTS
 * @type {Boolean}
 */
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);


/**
 * interval in which Hammer recalculates current velocity in ms
 * @property VELOCITY_INTERVAL
 * @type {Number}
 * @default 16
 */
Hammer.VELOCITY_INTERVAL = 16;


/**
 * eventtypes per touchevent (start, move, end) are filled by `Event.determineEventTypes` on `setup`
 * the object contains the DOM event names per type (`EVENT_START`, `EVENT_MOVE`, `EVENT_END`)
 * @property EVENT_TYPES
 * @writeOnce
 * @type {Object}
 */
Hammer.EVENT_TYPES = {};


/**
 * direction strings, for safe comparisons
 * @property DIRECTION_DOWN|LEFT|UP|RIGHT
 * @final
 * @type {String}
 * @default 'down' 'left' 'up' 'right'
 */
var DIRECTION_DOWN = Hammer.DIRECTION_DOWN = 'down';
var DIRECTION_LEFT = Hammer.DIRECTION_LEFT = 'left';
var DIRECTION_UP = Hammer.DIRECTION_UP = 'up';
var DIRECTION_RIGHT = Hammer.DIRECTION_RIGHT = 'right';


/**
 * pointertype strings, for safe comparisons
 * @property POINTER_MOUSE|TOUCH|PEN
 * @final
 * @type {String}
 * @default 'mouse' 'touch' 'pen'
 */
var POINTER_MOUSE = Hammer.POINTER_MOUSE = 'mouse';
var POINTER_TOUCH = Hammer.POINTER_TOUCH = 'touch';
var POINTER_PEN = Hammer.POINTER_PEN = 'pen';


/**
 * eventtypes
 * @property EVENT_START|MOVE|END|RELEASE|TOUCH
 * @final
 * @type {String}
 * @default 'start' 'change' 'move' 'end' 'release' 'touch'
 */
var EVENT_START = Hammer.EVENT_START = 'start';
var EVENT_MOVE = Hammer.EVENT_MOVE = 'move';
var EVENT_END = Hammer.EVENT_END = 'end';
var EVENT_RELEASE = Hammer.EVENT_RELEASE = 'release';
var EVENT_TOUCH = Hammer.EVENT_TOUCH = 'touch';


/**
 * plugins namespace
 * @property plugins
 * @type {Object}
 */
Hammer.plugins = Hammer.plugins || {};


/**
 * gestures namespace
 * see `/gestures` for the definitions
 * @property gestures
 * @type {Object}
 */
Hammer.gestures = Hammer.gestures || {};


/**
 * setup events to detect gestures on the document
 * this function is called when creating an new instance
 * @private
 */
function setup() {
  if(Hammer.READY) {
    return;
  }

  // find what eventtypes we add listeners to
  Event.determineEventTypes();

  // Register all gestures inside Hammer.gestures
  Utils.each(Hammer.gestures, function(gesture){
    Detection.register(gesture);
  });

  // Add touch events on the document
  Event.onTouch(Hammer.DOCUMENT, EVENT_MOVE, Detection.detect);
  Event.onTouch(Hammer.DOCUMENT, EVENT_END, Detection.detect);

  // Hammer is ready...!
  Hammer.READY = true;
}

/**
 * @module hammer
 * 
 * @class Utils
 * @static
 */
var Utils = Hammer.utils = {
  /**
   * extend method, could also be used for cloning when `dest` is an empty object.
   * changes the dest object
   * @method extend
   * @param {Object} dest
   * @param {Object} src
   * @param {Boolean} [merge=false]  do a merge
   * @return {Object} dest 
   */
  extend: function extend(dest, src, merge) {
    for(var key in src) {
      if(!src.hasOwnProperty(key) || dest[key] !== undefined && merge) {
        continue;
      }
      dest[key] = src[key];
    }
    return dest;
  },


  /**
   * forEach over arrays and objects
	 * @method each
   * @param {Object|Array} obj 
   * @param {Function} iterator 
   * @param	{any} iterator.item 
   * @param {Number} iterator.index 
   * @param {Object|Array} iterator.obj the source object
	 * @param	{Object} context value to use as `this` in the iterator
   */
  each: function each(obj, iterator, context) {
    var i, o;
    // native forEach on arrays
    if ('forEach' in obj) {
      obj.forEach(iterator, context);
    }
    // arrays
    else if(obj.length !== undefined) {
      for(i=-1; (o=obj[++i]);) {
        if (iterator.call(context, o, i, obj) === false) {
          return;
        }
      }
    }
    // objects
    else {
      for(i in obj) {
        if(obj.hasOwnProperty(i) &&
            iterator.call(context, obj[i], i, obj) === false) {
          return;
        }
      }
    }
  },


  /**
   * find if a string contains the string using indexOf
	 * @method inStr
   * @param {String} src
   * @param {String} find
   * @return {Boolean} found
   */
  inStr: function inStr(src, find) {
    return src.indexOf(find) > -1;
  },
  
  
  /**
   * find if a array contains the object using indexOf or a simple polyfill
	 * @method inArray
   * @param {String} src
   * @param {String} find
   * @return {Boolean} found
   */
  inArray: function inArray(src, find) {
    if(src.indexOf) {
      return src.indexOf(find) > -1;
    }
    else {
      for(var i= 0,len=src.length;i<len; i++) {
        if(src[i] === find) {
          return true;
        }
      }
      return false;
    }
  },


  /**
   * convert an array-like object (`arguments`, `touchlist`) to an array
   * @method toArray
   * @param {Object} obj
   * @returns {Array}
   */
  toArray: function toArray(obj) {
    return Array.prototype.slice.call(obj, 0);
  },


  /**
   * find if a node is in the given parent
	 * @method hasParent
   * @param {HTMLElement} node
   * @param {HTMLElement} parent
   * @return {Boolean} found
   */
  hasParent: function hasParent(node, parent) {
    while(node) {
      if(node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },


  /**
   * get the center of all the touches
	 * @method getCenter
   * @param {Array} touches
   * @return {Object} center contains `pageX`, `pageY`, `clientX` and `clientY` properties
   */
  getCenter: function getCenter(touches) {
    var pageX = []
      , pageY = []
      , clientX = []
      , clientY = []
      , min = Math.min
      , max = Math.max;

    // no need to loop when only one touch
    if(touches.length === 1) {
      return {
        pageX: touches[0].pageX,
        pageY: touches[0].pageY,
        clientX: touches[0].clientX,
        clientY: touches[0].clientY
      };
    }

    Utils.each(touches, function(touch) {
      pageX.push(touch.pageX);
      pageY.push(touch.pageY);
      clientX.push(touch.clientX);
      clientY.push(touch.clientY);
    });

    return {
      pageX: (min.apply(Math, pageX) + max.apply(Math, pageX)) / 2,
      pageY: (min.apply(Math, pageY) + max.apply(Math, pageY)) / 2,
      clientX: (min.apply(Math, clientX) + max.apply(Math, clientX)) / 2,
      clientY: (min.apply(Math, clientY) + max.apply(Math, clientY)) / 2
    };
  },


  /**
   * calculate the velocity between two points
	 * @method getVelocity
   * @param {Number} delta_time
   * @param {Number} delta_x
   * @param {Number} delta_y
   * @return {Object} velocity `x` and `y`
   */
  getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
    return {
      x: Math.abs(delta_x / delta_time) || 0,
      y: Math.abs(delta_y / delta_time) || 0
    };
  },


  /**
   * calculate the angle between two coordinates
	 * @method getAngle
   * @param {Touch} touch1
   * @param {Touch} touch2
   * @return {Number} angle
   */
  getAngle: function getAngle(touch1, touch2) {
    var x = touch2.clientX - touch1.clientX
      , y = touch2.clientY - touch1.clientY;
    return Math.atan2(y, x) * 180 / Math.PI;
  },


  /**
   * do a small comparision to get the direction between two touches.
	 * @method getDirection
   * @param {Touch} touch1
   * @param {Touch} touch2
   * @return {String} direction matches `DIRECTION_LEFT|RIGHT|UP|DOWN`
   */
  getDirection: function getDirection(touch1, touch2) {
    var x = Math.abs(touch1.clientX - touch2.clientX)
      , y = Math.abs(touch1.clientY - touch2.clientY);
    if(x >= y) {
      return touch1.clientX - touch2.clientX > 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return touch1.clientY - touch2.clientY > 0 ? DIRECTION_UP : DIRECTION_DOWN;
  },


  /**
   * calculate the distance between two touches
	 * @method getDistance
   * @param {Touch}touch1
   * @param {Touch} touch2 
   * @return {Number} distance
   */
  getDistance: function getDistance(touch1, touch2) {
    var x = touch2.clientX - touch1.clientX
      , y = touch2.clientY - touch1.clientY;
    return Math.sqrt((x * x) + (y * y));
  },


  /**
   * calculate the scale factor between two touchLists
   * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
	 * @method getScale
   * @param {Array} start array of touches
   * @param {Array} end array of touches
   * @return {Number} scale
   */
  getScale: function getScale(start, end) {
    // need two fingers...
    if(start.length >= 2 && end.length >= 2) {
      return this.getDistance(end[0], end[1]) / this.getDistance(start[0], start[1]);
    }
    return 1;
  },


  /**
   * calculate the rotation degrees between two touchLists
	 * @method getRotation
   * @param {Array} start array of touches
   * @param {Array} end array of touches
   * @return {Number} rotation
   */
  getRotation: function getRotation(start, end) {
    // need two fingers
    if(start.length >= 2 && end.length >= 2) {
      return this.getAngle(end[1], end[0]) - this.getAngle(start[1], start[0]);
    }
    return 0;
  },


  /**
   * find out if the direction is vertical	 * 
	 * @method isVertical
   * @param {String} direction matches `DIRECTION_UP|DOWN`
   * @return {Boolean} is_vertical
   */
  isVertical: function isVertical(direction) {
    return direction == DIRECTION_UP || direction == DIRECTION_DOWN;
  },


  /**
   * toggle browser default behavior by setting css properties.
	 * `userSelect='none'` also sets `element.onselectstart` to false
	 * `userDrag='none'` also sets `element.ondragstart` to false
	 * 
	 * @method toggleDefaultBehavior
   * @param {HtmlElement} element
   * @param {Object} css_props
   * @param {Boolean} [toggle=false]
   */
  toggleDefaultBehavior: function toggleDefaultBehavior(element, css_props, toggle) {
    if(!css_props || !element || !element.style) {
      return;
    }

    // with css properties for modern browsers
    Utils.each(['webkit', 'moz', 'Moz', 'ms', 'o', ''], function setStyle(vendor) {
      Utils.each(css_props, function(value, prop) {
          // vender prefix at the property
          if(vendor) {
            prop = vendor + prop.substring(0, 1).toUpperCase() + prop.substring(1);
          }
          // set the style
          if(prop in element.style) {
            element.style[prop] = !toggle && value;
          }
      });
    });

    var false_fn = function(){ return false; };

    // also the disable onselectstart
    if(css_props.userSelect == 'none') {
      element.onselectstart = !toggle && false_fn;
    }
    // and disable ondragstart
    if(css_props.userDrag == 'none') {
      element.ondragstart = !toggle && false_fn;
    }
  }
};


/**
 * @module hammer
 */

/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 * 
 * @class Instance
 * @constructor
 * @param {HTMLElement} element    
 * @param {Object} [options={}] options are merged with `Hammer.defaults`
 * @return {Hammer.Instance}
 */
Hammer.Instance = function(element, options) {
  var self = this;

  // setup HammerJS window events and register all gestures
  // this also sets up the default options
  setup();


  /**
   * @property element
   * @type {HTMLElement}
   */
  this.element = element;


  /**
   * @property enabled
   * @type {Boolean}
   * @protected
   */
  this.enabled = true;


  /**
   * options, merged with the defaults
   * @property options
   * @type {Object}
   */
  this.options = Utils.extend(
    Utils.extend({}, Hammer.defaults),
    options || {});

  // add some css to the element to prevent the browser from doing its native behavoir
  if(this.options.stop_browser_behavior) {
    Utils.toggleDefaultBehavior(this.element, this.options.stop_browser_behavior, false);
  }


  /**
   * event start handler on the element to start the detection
   * @property eventStartHandler
   * @type {Object}
   */
  this.eventStartHandler = Event.onTouch(element, EVENT_START, function(ev) {
    if(self.enabled && ev.eventType == EVENT_START) {
      Detection.startDetect(self, ev);
    }
    else if(ev.eventType == EVENT_TOUCH) {
      Detection.detect(ev);
    }
  });


  /**
   * keep a list of user event handlers which needs to be removed when calling 'dispose'
   * @property eventHandlers
   * @type {Array}
   */
  this.eventHandlers = [];
};


Hammer.Instance.prototype = {
  /**
   * bind events to the instance
	 * @method on
	 * @chainable
   * @param {String} gesture multiple gestures by splitting with a space
   * @param {Function} handler
   * @param {Object} handler.ev event object
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
   * @method off 
	 * @chainable
   * @param {String} gesture
   * @param {Function} handler
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
   * @method trigger
   * @chainable
   * @param {String} gesture
   * @param {Object} [eventData]
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
   * @method enable
   * @chainable
   * @param {Boolean} state
   */
  enable: function enable(state) {
    this.enabled = state;
    return this;
  },


  /**
   * dispose this hammer instance
   * @method dispose
   * @return {Null}
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


/**
 * @module hammer
 */


/**
 * when touch events have been fired, this is true
 * this is used to stop mouse events
 * @property touch_triggered
 * @private
 * @type {Boolean}
 */
var touch_triggered = false;


/**
 * if EVENT_START has been fired
 * @property started
 * @private
 * @type {Boolean}
 */
var started = false;


/**
 * when the mouse is hold down, this is true
 * @property should_detect
 * @private
 * @type {Boolean}
 */
var should_detect = false;


/**
 * @class Event
 * @static
 */
var Event = Hammer.event = {
  /**
   * simple addEventListener
   * @method bindDom
   * @param {HTMLElement} element
   * @param {String} type
   * @param {Function} handler
   */
  bindDom: function bindDom(element, type, handler) {
    var types = type.split(' ');
    Utils.each(types, function(type){
      element.addEventListener(type, handler, false);
    });
  },


  /**
   * simple removeEventListener
   * @method unbindDom
   * @param {HTMLElement} element
   * @param {String} type
   * @param {Function} handler
   */
  unbindDom: function unbindDom(element, type, handler) {
    var types = type.split(' ');
    Utils.each(types, function(type){
      element.removeEventListener(type, handler, false);
    });
  },


  /**
   * the core touch event handler.
   * this finds out what hammer-touch-events to trigger
   * @method onTouch
   * @param {HTMLElement} element
   * @param {String} eventType matches `EVENT_START|MOVE|END`
   * @param {Function} handler
   * @return bindDomOnTouch {Function} the core event handler
   */
  onTouch: function onTouch(element, eventType, handler) {
    var self = this;

    var bindDomOnTouch = function bindDomOnTouch(ev) {
      var src_type = ev.type.toLowerCase()
        , touchList_length
        , trigger_type
        , touchList
        , trigger_change
        , change_length
        , is_mouse = Utils.inStr(src_type, 'mouse');


      // onmouseup, but when touchend has been fired we do nothing.
      // this is for touchdevices which also fire a mouseup on touchend
      if(is_mouse && touch_triggered) {
        return;
      }

      // we are in a touch event, set the touch triggered bool to true,
      // this for the conflicts that may occur on ios and android
      else if(Utils.inStr(src_type, 'touch') || Utils.inStr(src_type, 'pointerdown')) {
        touch_triggered = true;
        should_detect = true;
      }

      // mousebutton must be down or a touch event
      else if(is_mouse && ev.which === 1) {
        should_detect = true;
      }

      // update pointerevent
      if(Hammer.HAS_POINTEREVENTS && eventType != EVENT_END) {
        PointerEvent.updatePointer(eventType, ev);
      }

      if(should_detect) {
        touchList = self.getTouchList(ev, eventType);
        touchList_length = touchList.length;
        trigger_type = eventType;
        change_length = touchList_length;

        // trigger touch changed events
        if(eventType == EVENT_START) {
          trigger_change = EVENT_TOUCH;
        }
        else if(eventType == EVENT_END) {
          trigger_change = EVENT_RELEASE;
          change_length = touchList.length - ((ev.changedTouches) ? ev.changedTouches.length : 1);
        }

        // there are still touches, trigger a move
        if(change_length > 0 && started) {
          trigger_type = EVENT_MOVE;
        }

        // detection has been started
        started = true;

        var ev_data = self.collectEventData(element, trigger_type, touchList, ev);

        // trigger the trigger_type event before the change events
        // but the event_end should be at last
        if(eventType != EVENT_END) {
          handler.call(Detection, ev_data);
        }

        // trigger a change event, this means the length of the touches changed
        if(trigger_change) {
          ev_data.changedLength = change_length;
          ev_data.eventType = trigger_change;

          handler.call(Detection, ev_data);

          ev_data.eventType = trigger_type;
          delete ev_data.changedLength;
        }

        if(trigger_type == EVENT_END) {
          handler.call(Detection, ev_data);
        }
      }

      // on the end we reset everything
      if(trigger_type == EVENT_END){
        touch_triggered = false;
        should_detect = false;
        started = false;
        PointerEvent.reset();
      }


      // remove pointerevent from list
      if(Hammer.HAS_POINTEREVENTS && eventType == EVENT_END) {
        PointerEvent.updatePointer(eventType, ev);
      }
    };

    this.bindDom(element, Hammer.EVENT_TYPES[eventType], bindDomOnTouch);

    // return the bound function to be able to unbind it later
    return bindDomOnTouch;
  },


  /**
   * we have different events for each device/browser
   * determine what we need and set them in the Hammer.EVENT_TYPES constant
   * @method determineEventTypes
   */
  determineEventTypes: function determineEventTypes() {
    var types;
    if(Hammer.HAS_POINTEREVENTS) {
      types = PointerEvent.getEvents();
    }
    else {
      types = [
        'touchstart mousedown',
        'touchmove mousemove',
        'touchend touchcancel mouseup'];
    }

    Hammer.EVENT_TYPES[EVENT_START] = types[0];
    Hammer.EVENT_TYPES[EVENT_MOVE] = types[1];
    Hammer.EVENT_TYPES[EVENT_END] = types[2];
  },


  /**
   * create touchlist depending on the event
   * @method getTouchList
   * @param {Object} ev
   * @param {String} eventType
   * @return {Array} touches
   */
  getTouchList: function getTouchList(ev, eventType) {
    // get the fake pointerEvent touchlist
    if(Hammer.HAS_POINTEREVENTS) {
      return PointerEvent.getTouchList();
    }

    // get the touchlist
    if(ev.touches) {
      if(eventType == EVENT_MOVE) {
        return ev.touches;
      }

      var identifiers = [];
      var concat_touches = [].concat(Utils.toArray(ev.touches), Utils.toArray(ev.changedTouches));
      var touchlist = [];

      Utils.each(concat_touches, function(touch) {
        if(!Utils.inArray(identifiers, touch.identifier)) {
          touchlist.push(touch);
        }
        identifiers.push(touch.identifier);
      });

      return touchlist;
    }

    // make fake touchlist from mouse position
    ev.identifier = 1;
    return [ev];
  },


  /**
   * collect basic event data
   * @method collectEventData
   * @param {HTMLElement} element
   * @param {String} eventType matches `EVENT_START|MOVE|END`
   * @param {Array} touches
   * @param {Object} ev
   * @return {Object} ev
   */
  collectEventData: function collectEventData(element, eventType, touches, ev) {
    // find out pointerType
    var pointerType = POINTER_TOUCH;
    if(Utils.inStr(ev.type, 'mouse') || PointerEvent.matchType(POINTER_MOUSE, ev)) {
      pointerType = POINTER_MOUSE;
    }

    return {
      center     : Utils.getCenter(touches),
      timeStamp  : Date.now(),
      target     : ev.target,
      touches    : touches,
      eventType  : eventType,
      pointerType: pointerType,
      srcEvent   : ev,

      /**
       * prevent the browser default actions
       * mostly used to disable scrolling of the browser
       */
      preventDefault: function() {
        var srcEvent = this.srcEvent;
        srcEvent.preventManipulation && srcEvent.preventManipulation();
        srcEvent.preventDefault && srcEvent.preventDefault();
      },

      /**
       * stop bubbling the event up to its parents
       */
      stopPropagation: function() {
        this.srcEvent.stopPropagation();
      },

      /**
       * immediately stop gesture detection
       * might be useful after a swipe was detected
       * @return {*}
       */
      stopDetect: function() {
        return Detection.stopDetect();
      }
    };
  }
};

/**
 * @module hammer
 * 
 * @class PointerEvent
 * @static
 */
var PointerEvent = Hammer.PointerEvent = {
  /**
   * holds all pointers, by `identifier`
	 * @property pointers
   * @type {Object}
   */
  pointers: {},

	
  /**
   * get the pointers as an array
	 * @method getTouchList
   * @return {Array} touchlist
   */
  getTouchList: function getTouchList() {
    var touchlist = [];
    // we can use forEach since pointerEvents only is in IE10
    Utils.each(this.pointers, function(pointer){
      touchlist.push(pointer);
    });

    return touchlist;
  },
	

  /**
   * update the position of a pointer
	 * @method updatePointer
   * @param {String} type matches `EVENT_START|MOVE|END`
   * @param {Object} pointerEvent
	 * @return count {Number} count the pointers
   */
  updatePointer: function updatePointer(type, pointerEvent) {
    if(type == EVENT_END) {
      delete this.pointers[pointerEvent.pointerId];
    }
    else {
      pointerEvent.identifier = pointerEvent.pointerId;
      this.pointers[pointerEvent.pointerId] = pointerEvent;
    }

    // it's save to use Object.keys, since pointerEvents are only in newer browsers
    return Object.keys(this.pointers).length;
  },
	

  /**
   * check if ev matches pointertype
	 * @method matchType
   * @param {String} pointerType matches `POINTER_MOUSE|TOUCH|PEN`
   * @param {PointerEvent} ev
   */
  matchType: function matchType(pointerType, ev) {
    if(!ev.pointerType) {
      return false;
    }

    var pt = ev.pointerType
      , types = {};

    types[POINTER_MOUSE] = (pt === (ev.MSPOINTER_TYPE_MOUSE || POINTER_MOUSE));
    types[POINTER_TOUCH] = (pt === (ev.MSPOINTER_TYPE_TOUCH || POINTER_TOUCH));
    types[POINTER_PEN] = (pt === (ev.MSPOINTER_TYPE_PEN || POINTER_PEN));
    return types[pointerType];
  },


  /**
   * get events to bind to
	 * @method getEvents
	 * @return {Array} events, in order of start, move and end
   */
  getEvents: function getEvents() {
    return [
      'pointerdown MSPointerDown',
      'pointermove MSPointerMove',
      'pointerup pointercancel MSPointerUp MSPointerCancel'
    ];
  },
	

  /**
   * reset the stored pointers
	 * @method reset
   */
  reset: function resetList() {
    this.pointers = {};
  }
};


/**
 * @module hammer
 * 
 * @class Detection
 * @static
 */
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
   * @method startDetect
   * @param {Hammer.Instance} inst
   * @param {Object} eventData
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
   * @method detect
   * @param {Object} eventData
   * @return {any}
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
   * @method stopDetect
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
   * @method getVelocityData
   * @param {Object} ev
   * @param {Number} delta_time
   * @param {Number} delta_x
   * @param {Number} delta_y
   */
  getVelocityData: function getVelocityData(ev, delta_time, delta_x, delta_y) {
    var cur = this.current
      , velocityEv = cur.lastVelocityEvent
      , velocity = cur.velocity;

    // calculate velocity every x ms
    if (velocityEv && ev.timeStamp - velocityEv.timeStamp > Hammer.VELOCITY_INTERVAL) {
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
   * @method getInterimData
   * @param {Object} ev
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
   * @method extendEventData
   * @param {Object} ev
   * @return {Object} ev
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
   * @method register
   * @param {Object} gesture object, see `gestures/` for documentation
   * @return {Array} gestures
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


/**
 * @module gestures
 */
/**
 * Move with x fingers (default 1) around on the page.
 * Preventing the default browser behavior is a good way to improve feel and working.
 * ````
 *  hammertime.on("drag", function(ev) {
 *    console.log(ev);
 *    ev.gesture.preventDefault();
 *  });
 * ````
 *
 * @class Drag
 * @static
 */
/**
 * @event drag
 * @param {Object} ev
 */
/**
 * @event dragstart
 * @param {Object} ev
 */
/**
 * @event dragend
 * @param {Object} ev
 */
/**
 * @event drapleft
 * @param {Object} ev
 */
/**
 * @event dragright
 * @param {Object} ev
 */
/**
 * @event dragup
 * @param {Object} ev
 */
/**
 * @event dragdown
 * @param {Object} ev
 */
Hammer.gestures.Drag = {
  name     : 'drag',
  index    : 50,
  defaults : {
    /**
     * minimal movement that have to be made before the drag event gets triggered
     * @property drag_min_distance
     * @type {Number}
     * @default 10
     */
    drag_min_distance: 10,

    /**
     * Set correct_for_drag_min_distance to true to make the starting point of the drag
     * be calculated from where the drag was triggered, not from where the touch started.
     * Useful to avoid a jerk-starting drag, which can make fine-adjustments
     * through dragging difficult, and be visually unappealing.
     * @property correct_for_drag_min_distance
     * @type {Boolean}
     * @default true
     */
    correct_for_drag_min_distance: true,

    /**
     * set 0 for unlimited, but this can conflict with transform
     * @property drag_max_touches
     * @type {Number}
     * @default 1
     */
    drag_max_touches: 1,

    /**
     * prevent default browser behavior when dragging occurs
     * be careful with it, it makes the element a blocking element
     * when you are using the drag gesture, it is a good practice to set this true
     * @property drag_block_horizontal
     * @type {Boolean}
     * @default false
     */
    drag_block_horizontal: false,

    /**
     * same as `drag_block_horizontal`, but for vertical movement
     * @property drag_block_vertical
     * @type {Boolean}
     * @default false
     */
    drag_block_vertical: false,

    /**
     * drag_lock_to_axis keeps the drag gesture on the axis that it started on,
     * It disallows vertical directions if the initial direction was horizontal, and vice versa.
     * @property drag_lock_to_axis
     * @type {Boolean}
     * @default false
     */
    drag_lock_to_axis: false,

    /**
     *  drag lock only kicks in when distance > drag_lock_min_distance
     * This way, locking occurs only when the distance has become large enough to reliably determine the direction
     * @property drag_lock_min_distance
     * @type {Number}
     * @default 25
     */
    drag_lock_min_distance: 25
  },


  triggered: false,

  handler  : function dragGesture(ev, inst) {
    var cur = Detection.current;

    // max touches
    if(inst.options.drag_max_touches > 0 &&
      ev.touches.length > inst.options.drag_max_touches) {
      return;
    }

    switch(ev.eventType) {
      case EVENT_START:
        this.triggered = false;
        break;

      case EVENT_MOVE:
        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(ev.distance < inst.options.drag_min_distance &&
          cur.name != this.name) {
          return;
        }

        var startCenter = cur.startEvent.center;

        // we are dragging!
        if(cur.name != this.name) {
          cur.name = this.name;
          if(inst.options.correct_for_drag_min_distance && ev.distance > 0) {
            // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
            // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
            // It might be useful to save the original start point somewhere
            var factor = Math.abs(inst.options.drag_min_distance / ev.distance);
            startCenter.pageX += ev.deltaX * factor;
            startCenter.pageY += ev.deltaY * factor;
            startCenter.clientX += ev.deltaX * factor;
            startCenter.clientY += ev.deltaY * factor;

            // recalculate event data using new start point
            ev = Detection.extendEventData(ev);
          }
        }

        // lock drag to axis?
        if(cur.lastEvent.drag_locked_to_axis ||
            ( inst.options.drag_lock_to_axis &&
              inst.options.drag_lock_min_distance <= ev.distance
            )) {
          ev.drag_locked_to_axis = true;
        }
        var last_direction = cur.lastEvent.direction;
        if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
          // keep direction on the axis that the drag gesture started on
          if(Utils.isVertical(last_direction)) {
            ev.direction = (ev.deltaY < 0) ? DIRECTION_UP : DIRECTION_DOWN;
          }
          else {
            ev.direction = (ev.deltaX < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
          }
        }

        // first time, trigger dragstart event
        if(!this.triggered) {
          inst.trigger(this.name + 'start', ev);
          this.triggered = true;
        }

        // trigger events
        inst.trigger(this.name, ev);
        inst.trigger(this.name + ev.direction, ev);

        var is_vertical = Utils.isVertical(ev.direction);

        // block the browser events
        if((inst.options.drag_block_vertical && is_vertical) ||
          (inst.options.drag_block_horizontal && !is_vertical)) {
          ev.preventDefault();
        }
        break;

      case EVENT_RELEASE:
        if(this.triggered && ev.changedLength <= inst.options.drag_max_touches) {
          inst.trigger(this.name + 'end', ev);
          this.triggered = false;
        }
        break;

      case EVENT_END:
        this.triggered = false;
        break;
    }
  }
};

/**
 * @module gestures
 */
/**
 * trigger a simple gesture event, so you can do anything in your handler.
 * only usable if you know what your doing...
 *
 * @class Gesture
 * @static
 */
/**
 * @event gesture
 * @param {Object} ev
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

/**
 * @module gestures
 */
/**
 * Touch stays at the same place for x time
 *
 * @class Hold
 * @static
 */
/**
 * @event hold
 * @param {Object} ev
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

/**
 * @module gestures
 */
/**
 * when a touch is being released from the page
 *
 * @class Release
 * @static
 */
/**
 * @event release
 * @param {Object} ev
 */
Hammer.gestures.Release = {
  name   : 'release',
  index  : Infinity,
  handler: function releaseGesture(ev, inst) {
    if(ev.eventType == EVENT_RELEASE) {
      inst.trigger(this.name, ev);
    }
  }
};

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
  name    : 'swipe',
  index   : 40,
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
     * @property swipe_velocity
     * @type {Number}
     * @default 0.7
     */
    swipe_velocity: 0.7
  },
  handler : function swipeGesture(ev, inst) {
    if(ev.eventType == EVENT_RELEASE) {
      // max touches
      if(ev.touches.length < inst.options.swipe_min_touches ||
        ev.touches.length > inst.options.swipe_max_touches) {
        return;
      }

      // when the distance we moved is too small we skip this gesture
      // or we can be already in dragging
      if(ev.velocityX > inst.options.swipe_velocity ||
        ev.velocityY > inst.options.swipe_velocity) {
        // trigger swipe events
        inst.trigger(this.name, ev);
        inst.trigger(this.name + ev.direction, ev);
      }
    }
  }
};

/**
 * @module gestures
 */
/**
 * Single tap and a double tap on a place
 *
 * @class Tap
 * @static
 */
/**
 * @event tap
 * @param {Object} ev
 */
/**
 * @event doubletap
 * @param {Object} ev
 */
Hammer.gestures.Tap = {
  name    : 'tap',
  index   : 100,
  defaults: {
    /**
     * max time of a tap, this is for the slow tappers
     * @property tap_max_touchtime
     * @type {Number}
     * @default 250
     */
    tap_max_touchtime : 250,

    /**
     * max distance of movement of a tap, this is for the slow tappers
     * @property tap_max_distance
     * @type {Number}
     * @default 10
     */
    tap_max_distance  : 10,

    /**
     * always trigger the `tap` event, even while double-tapping
     * @property tap_always
     * @type {Boolean}
     * @default true
     */
    tap_always        : true,

    /**
     * max distance between two taps
     * @property doubletap_distance
     * @type {Number}
     * @default 20
     */
    doubletap_distance: 20,

    /**
     * max time between two taps
     * @property doubletap_interval
     * @type {Number}
     * @default 300
     */
    doubletap_interval: 300
  },

  has_moved: false,

  handler : function tapGesture(ev, inst) {
    var prev, since_prev, did_doubletap;

    // reset moved state
    if(ev.eventType == EVENT_START) {
      this.has_moved = false;
    }

    // Track the distance we've moved. If it's above the max ONCE, remember that (fixes #406).
    else if(ev.eventType == EVENT_MOVE && !this.moved) {
      this.has_moved = (ev.distance > inst.options.tap_max_distance);
    }

    else if(ev.eventType == EVENT_END &&
        ev.srcEvent.type != 'touchcancel' &&
        ev.deltaTime < inst.options.tap_max_touchtime && !this.has_moved) {

      // previous gesture, for the double tap since these are two different gesture detections
      prev = Detection.previous;
      since_prev = prev && prev.lastEvent && ev.timeStamp - prev.lastEvent.timeStamp;
      did_doubletap = false;

      // check if double tap
      if(prev && prev.name == 'tap' &&
          (since_prev && since_prev < inst.options.doubletap_interval) &&
          ev.distance < inst.options.doubletap_distance) {
        inst.trigger('doubletap', ev);
        did_doubletap = true;
      }

      // do a single tap
      if(!did_doubletap || inst.options.tap_always) {
        Detection.current.name = 'tap';
        inst.trigger(Detection.current.name, ev);
      }
    }
  }
};

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
  name    : 'touch',
  index   : -Infinity,
  defaults: {
    /**
     * call preventDefault at touchstart, and makes the element blocking by disabling the scrolling of the page,
     * but it improves gestures like transforming and dragging.
     * be careful with using this, it can be very annoying for users to be stuck on the page
     * @property prevent_default
     * @type {Boolean}
     * @default false
     */
    prevent_default    : false,

    /**
     * disable mouse events, so only touch (or pen!) input triggers events
     * @property prevent_mouseevents
     * @type {Boolean}
     * @default false
     */
    prevent_mouseevents: false
  },
  handler : function touchGesture(ev, inst) {
    if(inst.options.prevent_mouseevents && ev.pointerType == POINTER_MOUSE) {
      ev.stopDetect();
      return;
    }

    if(inst.options.prevent_default) {
      ev.preventDefault();
    }

    if(ev.eventType == EVENT_TOUCH) {
      inst.trigger(this.name, ev);
    }
  }
};


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
    transform_min_scale      : 0.01,

    /**
     * rotation in degrees
     * @property transform_min_rotation
     * @type {Number}
     * @default 1
     */
    transform_min_rotation   : 1,


    /**
     * prevent default browser behavior when two touches are on the screen
     * but it makes the element a blocking element
     * when you are using the transform gesture, it is a good practice to set this true
     * @property transform_always_block
     * @type {Boolean}
     * @default false
     */
    transform_always_block   : false,


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

// AMD export
if(typeof define == 'function' && define.amd) {
  define(function(){
    return Hammer;
  });
}
// commonjs export
else if(typeof module !== 'undefined' && module.exports) {
  module.exports = Hammer;
}
// browser export
else {
  window.Hammer = Hammer;
}

})(window);