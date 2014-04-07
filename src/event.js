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
   * @param {String} [eventType] used by the fakemultitouch plugin
   * @return {Array} touches
   */
  getTouchList: function getTouchList(ev/*, eventType*/) {
    // get the fake pointerEvent touchlist
    if(Hammer.HAS_POINTEREVENTS) {
      return PointerEvent.getTouchList();
    }

    // get the touchlist
    if(ev.touches) {
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