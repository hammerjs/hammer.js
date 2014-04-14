/*! Hammer.JS - v1.1.0dev - 2014-04-14
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
 * default settings.
 * more settings are defined per gesture at `/gestures`. Each gesture can be disabled/enabled
 * by setting it's name (like `swipe`) to false.
 * You can set the defaults for all instances by changing this object before creating an instance.
 * @example
 * ````
 *  Hammer.defaults.drag = false;
 *  Hammer.defaults.behavior.touchAction = 'pan-y';
 *  delete Hammer.defaults.behavior.userSelect;
 * ````
 * @property defaults
 * @type {Object}
 */
Hammer.defaults = {
  /**
   * this setting object adds styles and attributes to the element to prevent the browser from doing
   * its native behavior. The css properties are auto prefixed for the browsers when needed.
   * @property defaults.behavior
   * @type {Object}
   */
  behavior: {
    /**
     * Disables text selection to improve the dragging gesture. When the value is `none` it also sets
     * `onselectstart=false` for IE on the element. Mainly for desktop browsers.
     * @property defaults.behavior.userSelect
     * @type {String}
     * @default 'none'
     */
    userSelect: 'none',

    /**
     * Specifies whether and how a given region can be manipulated by the user (for instance, by panning or zooming).
     * Used by IE10>. By default this makes the element blocking any touch event.
     * @property defaults.behavior.touchAction
     * @type {String}
     * @default: 'none'
     */
    touchAction: 'none',

    /**
     * Disables the default callout shown when you touch and hold a touch target.
     * On iOS, when you touch and hold a touch target such as a link, Safari displays
     * a callout containing information about the link. This property allows you to disable that callout.
     * @property defaults.behavior.touchCallout
     * @type {String}
     * @default 'none'
     */
    touchCallout: 'none',

    /**
     * Specifies whether zooming is enabled. Used by IE10>
     * @property defaults.behavior.contentZooming
     * @type {String}
     * @default 'none'
     */
    contentZooming: 'none',

    /**
     * Specifies that an entire element should be draggable instead of its contents.
     * Mainly for desktop browsers.
     * @property defaults.behavior.userDrag
     * @type {String}
     * @default 'none'
     */
    userDrag: 'none',

    /**
     * Overrides the highlight color shown when the user taps a link or a JavaScript
     * clickable element in Safari on iPhone. This property obeys the alpha value, if specified.
     *
     * If you don't specify an alpha value, Safari on iPhone applies a default alpha value
     * to the color. To disable tap highlighting, set the alpha value to 0 (invisible).
     * If you set the alpha value to 1.0 (opaque), the element is not visible when tapped.
     * @property defaults.behavior.tapHighlightColor
     * @type {String}
     * @default 'rgba(0,0,0,0)'
     */
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
 * interval in which Hammer recalculates current velocity/direction/angle in ms
 * @property CALCULATE_INTERVAL
 * @type {Number}
 * @default 50
 */
Hammer.CALCULATE_INTERVAL = 50;


/**
 * eventtypes per touchevent (start, move, end) are filled by `Event.determineEventTypes` on `setup`
 * the object contains the DOM event names per type (`EVENT_START`, `EVENT_MOVE`, `EVENT_END`)
 * @property EVENT_TYPES
 * @private
 * @writeOnce
 * @type {Object}
 */
var EVENT_TYPES = {};


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
 * if the window events are set...
 * @property READY
 * @writeOnce
 * @type {Boolean}
 * @default false
 */
Hammer.READY = false;


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
      if(dest[key] !== undefined && merge || key == 'returnValue') {
        continue;
      }
      dest[key] = src[key];
    }
    return dest;
  },


  /**
   * simple addEventListener wrapper
   * @method on
   * @param {HTMLElement} element
   * @param {String} type
   * @param {Function} handler
   */
  on: function on(element, type, handler) {
    element.addEventListener(type, handler, false);
  },


  /**
   * simple removeEventListener wrapper
   * @method off
   * @param {HTMLElement} element
   * @param {String} type
   * @param {Function} handler
   */
  off: function off(element, type, handler) {
    element.removeEventListener(type, handler, false);
  },


  /**
   * forEach over arrays and objects
   * @method each
   * @param {Object|Array} obj
   * @param {Function} iterator
   * @param {any} iterator.item
   * @param {Number} iterator.index
   * @param {Object|Array} iterator.obj the source object
   * @param {Object} context value to use as `this` in the iterator
   */
  each: function each(obj, iterator, context) {
    var i, len;
    // native forEach on arrays
    if ('forEach' in obj) {
      obj.forEach(iterator, context);
    }
    // arrays
    else if(obj.length !== undefined) {
      for(i=0,len=obj.length; i<len; i++) {
        if (iterator.call(context, obj[i], i, obj) === false) {
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
   * @return {Boolean|Number} false when not found, or the index
   */
  inArray: function inArray(src, find) {
    if(src.indexOf) {
      var index = src.indexOf(find);
      return (index === -1) ? false : index;
    }
    else {
      for(var i= 0,len=src.length;i<len; i++) {
        if(src[i] === find) {
          return i;
        }
      }
      return false;
    }
  },


  /**
   * convert an array-like object (`arguments`, `touchlist`) to an array
   * @method toArray
   * @param {Object} obj
   * @return {Array}
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
   * calculate the velocity between two points. unit is in px per ms.
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
    var x = touch2.clientX - touch1.clientX,
      y = touch2.clientY - touch1.clientY;
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
    var x = Math.abs(touch1.clientX - touch2.clientX),
      y = Math.abs(touch1.clientY - touch2.clientY);

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
   * find out if the direction is vertical   *
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
   * @method toggleBehavior
   * @param {HtmlElement} element
   * @param {Object} css_props
   * @param {Boolean} [toggle=false]
   */
  toggleBehavior: function toggleBehavior(element, css_props, toggle) {
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
 * @class Event
 * @static
 */
var Event = Hammer.event = {
  /**
   * when touch events have been fired, this is true
   * this is used to stop mouse events
   * @property prevent_mouseevents
   * @private
   * @type {Boolean}
   */
  prevent_mouseevents: false,


  /**
   * if EVENT_START has been fired
   * @property started
   * @private
   * @type {Boolean}
   */
  started: false,


  /**
   * when the mouse is hold down, this is true
   * @property should_detect
   * @private
   * @type {Boolean}
   */
  should_detect: false,


  /**
   * simple event binder with a hook and support for multiple types
   * @method on
   * @param {HTMLElement} element
   * @param {String} type
   * @param {Function} handler
   * @param {Function} [hook]
   * @param {Object} hook.type
   */
  on: function on(element, type, handler, hook) {
    var types = type.split(' ');
    Utils.each(types, function(type){
      Utils.on(element, type, handler);
      hook && hook(type);
    });
  },


  /**
   * simple event unbinder with a hook and support for multiple types
   * @method off
   * @param {HTMLElement} element
   * @param {String} type
   * @param {Function} handler
   * @param {Function} [hook]
   * @param {Object} hook.type
   */
  off: function off(element, type, handler, hook) {
    var types = type.split(' ');
    Utils.each(types, function(type){
      Utils.off(element, type, handler);
      hook && hook(type);
    });
  },


  /**
   * the core touch event handler.
   * this finds out if we should to detect gestures
   * @method onTouch
   * @param {HTMLElement} element
   * @param {String} eventType matches `EVENT_START|MOVE|END`
   * @param {Function} handler
   * @return onTouchHandler {Function} the core event handler
   */
  onTouch: function onTouch(element, eventType, handler) {
    var self = this;

    var onTouchHandler = function onTouchHandler(ev) {
      var src_type = ev.type.toLowerCase()
        , has_pointerevents = Hammer.HAS_POINTEREVENTS
        , trigger_type
        , is_mouse = Utils.inStr(src_type, 'mouse');
      
      // if we are in a mouseevent, but there has been a touchevent triggered in this session
      // we want to do nothing. simply break out of the event.
      if(is_mouse && self.prevent_mouseevents) {
        return;
      }
      // mousebutton must be down
      else if(is_mouse && eventType == EVENT_START) {
        self.prevent_mouseevents = false;
        self.should_detect = true;
      }
      // just a valid start event, but no mouse
      else if(eventType == EVENT_START && !is_mouse) {
        self.prevent_mouseevents = true;
        self.should_detect = true;
      }

      // update the pointer event before entering the detection
      if(has_pointerevents && eventType != EVENT_END) {
        PointerEvent.updatePointer(eventType, ev);
      }

      // we are in a touch/down state, so allowed detection of gestures
      if(self.should_detect) {
        trigger_type = self.doDetect.call(self, ev, eventType, element, handler);
      }

      // ...and we are done with the detection
      // so reset everything to start each detection totally fresh
      if(trigger_type == EVENT_END) {
        self.prevent_mouseevents = false;
        self.should_detect = false;
        PointerEvent.reset();
      }
      // update the pointerevent object after the detection
      else if(has_pointerevents && eventType == EVENT_END) {
        PointerEvent.updatePointer(eventType, ev);
      }
    };

    this.on(element, EVENT_TYPES[eventType], onTouchHandler);
    return onTouchHandler;
  },


  /**
   * the core detection method
   * this finds out what hammer-touch-events to trigger
   * @method doDetect
   * @param {Object} ev
   * @param {String} eventType matches `EVENT_START|MOVE|END`
   * @param {HTMLElement} element
   * @param {Function} handler
   * @return {String} triggerType matches `EVENT_START|MOVE|END`
   */
  doDetect: function doDetect(ev, eventType, element, handler) {
    var touchList = this.getTouchList(ev, eventType);
    var touchList_length = touchList.length;
    var trigger_type = eventType;
    var trigger_change = touchList.trigger; // used by fakeMultitouch plugin
    var change_length = touchList_length;

    // at each touchstart-like event we want also want to trigger a TOUCH event...
    if(eventType == EVENT_START) {
      trigger_change = EVENT_TOUCH;
    }
    // ...the same for a touchend-like event
    else if(eventType == EVENT_END) {
      trigger_change = EVENT_RELEASE;

      // keep track of how many touches have been removed
      change_length = touchList.length - ((ev.changedTouches) ? ev.changedTouches.length : 1);
    }

    // after there are still touches on the screen,
    // we just want to trigger a MOVE event. so change the START or END to a MOVE
    // but only after detection has been started, the first time we actualy want a START
    if(change_length > 0 && this.started) {
      trigger_type = EVENT_MOVE;
    }

    // detection has been started, we keep track of this, see above
    this.started = true;

    // generate some event data, some basic information
    var ev_data = this.collectEventData(element, trigger_type, touchList, ev);

    // trigger the trigger_type event before the change (TOUCH, RELEASE) events
    // but the END event should be at last
    if(eventType != EVENT_END) {
      handler.call(Detection, ev_data);
    }

    // trigger a change (TOUCH, RELEASE) event, this means the length of the touches changed
    if(trigger_change) {
      ev_data.changedLength = change_length;
      ev_data.eventType = trigger_change;

      handler.call(Detection, ev_data);

      ev_data.eventType = trigger_type;
      delete ev_data.changedLength;
    }

    // trigger the END event
    if(trigger_type == EVENT_END) {
      handler.call(Detection, ev_data);

      // ...and we are done with the detection
      // so reset everything to start each detection totally fresh
      this.started = false;
    }

    return trigger_type;
  },


  /**
   * we have different events for each device/browser
   * determine what we need and set them in the EVENT_TYPES constant
   * the `onTouch` method is bind to these properties.
   * @method determineEventTypes
   * @return {Object} events
   */
  determineEventTypes: function determineEventTypes() {
    var types;
    if(Hammer.HAS_POINTEREVENTS) {
      // prefixed or full support?
      if(window.PointerEvent) {
        types = [
          'pointerdown',
          'pointermove',
          'pointerup pointercancel'
        ];
      }
      // only IE has prefixed
      else {
        types = [
          'MSPointerDown',
          'MSPointerMove',
          'MSPointerUp MSPointerCancel'
        ];
      }
    }
    else {
      types = [
        'touchstart mousedown',
        'touchmove mousemove',
        'touchend touchcancel mouseup'];
    }

    EVENT_TYPES[EVENT_START] = types[0];
    EVENT_TYPES[EVENT_MOVE] = types[1];
    EVENT_TYPES[EVENT_END] = types[2];
    return EVENT_TYPES;
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
        if(Utils.inArray(identifiers, touch.identifier) === false) {
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
   * @param {String} eventType matches `EVENT_START|MOVE|END`
   * @param {Object} pointerEvent
   */
  updatePointer: function updatePointer(eventType, pointerEvent) {
    if(eventType == EVENT_END) {
      delete this.pointers[pointerEvent.pointerId];
    }
    else {
      pointerEvent.identifier = pointerEvent.pointerId;
      this.pointers[pointerEvent.pointerId] = pointerEvent;
    }
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
      inst: inst, // reference to HammerInstance we're working for
      startEvent: Utils.extend({}, eventData), // start eventData for distances, timing etc
      lastEvent: false, // last eventData
      lastCalcEvent: false, // last eventData for calculations.
      futureCalcEvent: false, // last eventData for calculations.
      lastCalcData: {}, // last lastCalcData
      name: '' // current gesture we're in/detected, can be 'tap', 'hold' etc
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
      if(!this.stopped && inst.enabled && inst_options[gesture.name]) {
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

    if(eventData.eventType == EVENT_END) {
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
   * calculate velocity, angle and direction
   * @method getVelocityData
   * @param {Object} ev
   * @param {Number} delta_time
   * @param {Number} delta_x
   * @param {Number} delta_y
   */
  getCalculatedData: function getCalculatedData(ev, center, delta_time, delta_x, delta_y) {
    var cur = this.current
      , recalc = false
      , calcEv = cur.lastCalcEvent
      , calcData = cur.lastCalcData;

    if(calcEv && ev.timeStamp - calcEv.timeStamp > Hammer.CALCULATE_INTERVAL) {
      center = calcEv.center;
      delta_time = ev.timeStamp - calcEv.timeStamp;
      delta_x = ev.center.clientX - calcEv.center.clientX;
      delta_y = ev.center.clientY - calcEv.center.clientY;
      recalc = true;
    }

    if(ev.eventType == EVENT_TOUCH || ev.eventType == EVENT_RELEASE) {
      cur.futureCalcEvent = ev;
    }

    if(!cur.lastCalcEvent || recalc) {
      calcData.velocity = Utils.getVelocity(delta_time, delta_x, delta_y);
      calcData.angle = Utils.getAngle(center, ev.center);
      calcData.direction = Utils.getDirection(center, ev.center);

      cur.lastCalcEvent = cur.futureCalcEvent || ev;
      cur.futureCalcEvent = ev;
    }

    ev.velocityX = calcData.velocity.x;
    ev.velocityY = calcData.velocity.y;
    ev.angle = calcData.angle;
    ev.direction = calcData.direction;
  },


  /**
   * extend eventData for Hammer.gestures
   * @method extendEventData
   * @param {Object} ev
   * @return {Object} ev
   */
  extendEventData: function extendEventData(ev) {
    var cur = this.current
      , startEv = cur.startEvent
      , lastEv = cur.lastEvent || startEv;

    // update the start touchlist to calculate the scale/rotation
    if(ev.eventType == EVENT_TOUCH || ev.eventType == EVENT_RELEASE) {
      startEv.touches = [];
      Utils.each(ev.touches, function(touch) {
        startEv.touches.push(Utils.extend({}, touch));
      });
    }

    var delta_time = ev.timeStamp - startEv.timeStamp
      , delta_x = ev.center.clientX - startEv.center.clientX
      , delta_y = ev.center.clientY - startEv.center.clientY;

    this.getCalculatedData(ev, lastEv.center, delta_time, delta_x, delta_y);

    Utils.extend(ev, {
      startEvent: startEv,

      deltaTime : delta_time,
      deltaX    : delta_x,
      deltaY    : delta_y,

      distance  : Utils.getDistance(startEv.center, ev.center),

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
  if(this.options.behavior) {
    Utils.toggleBehavior(this.element, this.options.behavior, false);
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
   * @param {String} gestures multiple gestures by splitting with a space
   * @param {Function} handler
   * @param {Object} handler.ev event object
   */
  on: function onEvent(gestures, handler) {
    var self = this;
    Event.on(self.element, gestures, handler, function(type) {
      self.eventHandlers.push({ gesture: type, handler: handler });
    });
    return self;
  },


  /**
   * unbind events to the instance
   * @method off
   * @chainable
   * @param {String} gestures
   * @param {Function} handler
   */
  off: function offEvent(gestures, handler) {
    var self = this;

    Event.off(self.element, gestures, handler, function(type) {
      var index = Utils.inArray({ gesture: type, handler: handler });
      if(index !== false) {
        self.eventHandlers.splice(index, 1);
      }
    });
    return self;
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
    if(this.options.behavior) {
      Utils.toggleBehavior(this.element, this.options.behavior, true);
    }

    // unbind all custom event handlers
    for(i=-1; (eh=this.eventHandlers[++i]);) {
      Utils.off(this.element, eh.gesture, eh.handler);
    }
    this.eventHandlers = [];

    // unbind the start event listener
    Event.off(this.element, EVENT_TYPES[EVENT_START], this.eventStartHandler);

    return null;
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
(function(name) {
  var triggered = false;

  function dragGesture(ev, inst) {
    var cur = Detection.current;

    // max touches
    if(inst.options.drag_max_touches > 0 &&
      ev.touches.length > inst.options.drag_max_touches) {
      return;
    }

    switch(ev.eventType) {
      case EVENT_START:
        triggered = false;
        break;

      case EVENT_MOVE:
        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(ev.distance < inst.options.drag_min_distance &&
          cur.name != name) {
          return;
        }

        var startCenter = cur.startEvent.center;

        // we are dragging!
        if(cur.name != name) {
          cur.name = name;
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
        if(!triggered) {
          inst.trigger(name + 'start', ev);
          triggered = true;
        }

        // trigger events
        inst.trigger(name, ev);
        inst.trigger(name + ev.direction, ev);

        var is_vertical = Utils.isVertical(ev.direction);

        // block the browser events
        if((inst.options.drag_block_vertical && is_vertical) ||
          (inst.options.drag_block_horizontal && !is_vertical)) {
          ev.preventDefault();
        }
        break;

      case EVENT_RELEASE:
        if(triggered && ev.changedLength <= inst.options.drag_max_touches) {
          inst.trigger(name + 'end', ev);
          triggered = false;
        }
        break;

      case EVENT_END:
        triggered = false;
        break;
    }
  }


  Hammer.gestures.Drag = {
    name: name,
    index: 50,
    handler: dragGesture,
    defaults: {
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
    }
  };
})('drag');

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
(function(name) {
  var timer;

  function holdGesture(ev, inst) {
    var options = inst.options
      , current = Detection.current;

    switch(ev.eventType) {
      case EVENT_START:
        clearTimeout(timer);

        // set the gesture so we can check in the timeout if it still is
        current.name = name;

        // set timer and if after the timeout it still is hold,
        // we trigger the hold event
        timer = setTimeout(function() {
          if(current && current.name == name) {
            inst.trigger(name, ev);
          }
        }, options.hold_timeout);
        break;

      case EVENT_MOVE:
        if(ev.distance > options.hold_threshold) {
          clearTimeout(timer);
        }
        break;

      case EVENT_RELEASE:
        clearTimeout(timer);
        break;
    }
  }

  Hammer.gestures.Hold = {
    name: name,
    index: 10,
    defaults: {
      /**
       * @property hold_timeout
       * @type {Number}
       * @default 500
       */
      hold_timeout: 500,

      /**
       * movement allowed while holding
       * @property hold_threshold
       * @type {Number}
       * @default 2
       */
      hold_threshold: 2
    },
    handler: holdGesture
  };
})('hold');

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
(function(name) {
  var has_moved = false;

  function tapGesture(ev, inst) {
    var options = inst.options
      , current = Detection.current
      , prev = Detection.previous
      , since_prev
      , did_doubletap;

    switch(ev.eventType) {
      case EVENT_START:
        has_moved = false;
        break;

      case EVENT_MOVE:
        has_moved = has_moved || (ev.distance > options.tap_max_distance);
        break;

      case EVENT_END:
        if(ev.srcEvent.type != 'touchcancel' && ev.deltaTime < options.tap_max_touchtime && !has_moved) {
          // previous gesture, for the double tap since these are two different gesture detections
          since_prev = prev && prev.lastEvent && ev.timeStamp - prev.lastEvent.timeStamp;
          did_doubletap = false;

          // check if double tap
          if(prev && prev.name == name &&
              (since_prev && since_prev < options.doubletap_interval) &&
              ev.distance < options.doubletap_distance) {
            inst.trigger('doubletap', ev);
            did_doubletap = true;
          }

          // do a single tap
          if(!did_doubletap || options.tap_always) {
            current.name = name;
            inst.trigger(current.name, ev);
          }
        }
    }
  }

  Hammer.gestures.Tap = {
    name: name,
    index: 100,
    handler: tapGesture,
    defaults: {
      /**
       * max time of a tap, this is for the slow tappers
       * @property tap_max_touchtime
       * @type {Number}
       * @default 250
       */
      tap_max_touchtime: 250,

      /**
       * max distance of movement of a tap, this is for the slow tappers
       * @property tap_max_distance
       * @type {Number}
       * @default 10
       */
      tap_max_distance: 10,

      /**
       * always trigger the `tap` event, even while double-tapping
       * @property tap_always
       * @type {Boolean}
       * @default true
       */
      tap_always: true,

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
    }
  };
})('tap');

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

/**
 * @module hammer
 */
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