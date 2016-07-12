import assign from './utils/assign';
import  Hammer  from './hammer';
import TouchAction from './touchactionjs/touchaction-constructor';
import createInputInstance from './inputjs/create-input-instance';
import each from './utils/each';
import inArray from './utils/in-array';
import invokeArrayArg from './utils/invoke-array-arg';
import splitStr from './utils/split-str';
import prefixed from './utils/prefixed';
import Recognizer from './recognizerjs/recognizer-constructor';
import {
    STATE_BEGAN,
    STATE_ENDED,
    STATE_CHANGED,
    STATE_RECOGNIZED
} from './recognizerjs/recognizer-consts';

const STOP = 1;
const FORCED_STOP = 2;

/**
* @private
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
export default class Manager {
  constructor(element, options) {
    this.options = assign({}, Hammer.defaults, options || {});

    this.options.inputTarget = this.options.inputTarget || element;

    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};

    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);

    each(this.options.recognizers, (item) => {
      let recognizer = this.add(new (item[0])(item[1]));
      item[2] && recognizer.recognizeWith(item[2]);
      item[3] && recognizer.requireFailure(item[3]);
    }, this);
  }

  /**
   * @private
   * set options
   * @param {Object} options
   * @returns {Manager}
   */
  set(options) {
    assign(this.options, options);

    // Options that need a little more setup
    if (options.touchAction) {
      this.touchAction.update();
    }
    if (options.inputTarget) {
      // Clean up existing event listeners and reinitialize
      this.input.destroy();
      this.input.target = options.inputTarget;
      this.input.init();
    }
    return this;
  }

  /**
   * @private
   * stop recognizing for this session.
   * This session will be discarded, when a new [input]start event is fired.
   * When forced, the recognizer cycle is stopped immediately.
   * @param {Boolean} [force]
   */
  stop(force) {
    this.session.stopped = force ? FORCED_STOP : STOP;
  }

  /**
   * @private
   * run the recognizers!
   * called by the inputHandler function on every movement of the pointers (touches)
   * it walks through all the recognizers and tries to detect the gesture that is being made
   * @param {Object} inputData
   */
  recognize(inputData) {
    let { session } = this;
    if (session.stopped) {
      return;
    }

    // run the touch-action polyfill
    this.touchAction.preventDefaults(inputData);

    let recognizer;
    let { recognizers } = this;

    // this holds the recognizer that is being recognized.
    // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
    // if no recognizer is detecting a thing, it is set to `null`
    let { curRecognizer } = session;

    // reset when the last recognizer is recognized
    // or when we're in a new session
    if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
      curRecognizer = session.curRecognizer = null;
    }

    let i = 0;
    while (i < recognizers.length) {
      recognizer = recognizers[i];

      // find out if we are allowed try to recognize the input for this one.
      // 1.   allow if the session is NOT forced stopped (see the .stop() method)
      // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
      //      that is being recognized.
      // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
      //      this can be setup with the `recognizeWith()` method on the recognizer.
      if (session.stopped !== FORCED_STOP && (// 1
              !curRecognizer || recognizer === curRecognizer || // 2
              recognizer.canRecognizeWith(curRecognizer))) { // 3
        recognizer.recognize(inputData);
      } else {
        recognizer.reset();
      }

      // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
      // current active recognizer. but only if we don't already have an active recognizer
      if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
        curRecognizer = session.curRecognizer = recognizer;
      }
      i++;
    }
  }

  /**
   * @private
   * get a recognizer by its event name.
   * @param {Recognizer|String} recognizer
   * @returns {Recognizer|Null}
   */
  get(recognizer) {
    if (recognizer instanceof Recognizer) {
      return recognizer;
    }

    let { recognizers } = this;
    for (let i = 0; i < recognizers.length; i++) {
      if (recognizers[i].options.event === recognizer) {
        return recognizers[i];
      }
    }
    return null;
  }

  /**
   * @private add a recognizer to the manager
   * existing recognizers with the same event name will be removed
   * @param {Recognizer} recognizer
   * @returns {Recognizer|Manager}
   */
  add(recognizer) {
    if (invokeArrayArg(recognizer, 'add', this)) {
      return this;
    }

    // remove existing
    let existing = this.get(recognizer.options.event);
    if (existing) {
      this.remove(existing);
    }

    this.recognizers.push(recognizer);
    recognizer.manager = this;

    this.touchAction.update();
    return recognizer;
  }

  /**
   * @private
   * remove a recognizer by name or instance
   * @param {Recognizer|String} recognizer
   * @returns {Manager}
   */
  remove(recognizer) {
    if (invokeArrayArg(recognizer, 'remove', this)) {
      return this;
    }

    recognizer = this.get(recognizer);

    // let's make sure this recognizer exists
    if (recognizer) {
      let { recognizers } = this;
      let index = inArray(recognizers, recognizer);

      if (index !== -1) {
        recognizers.splice(index, 1);
        this.touchAction.update();
      }
    }

    return this;
  }

  /**
   * @private
   * bind event
   * @param {String} events
   * @param {Function} handler
   * @returns {EventEmitter} this
   */
  on(events, handler) {
    if (events === undefined) {
      return;
    }
    if (handler === undefined) {
      return;
    }

    let { handlers } = this;
    each(splitStr(events), (event) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });
    return this;
  }

  /**
   * @private unbind event, leave emit blank to remove all handlers
   * @param {String} events
   * @param {Function} [handler]
   * @returns {EventEmitter} this
   */
  off(events, handler) {
    if (events === undefined) {
      return;
    }

    let { handlers } = this;
    each(splitStr(events), (event) => {
      if (!handler) {
        delete handlers[event];
      } else {
        handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
      }
    });
    return this;
  }

  /**
   * @private emit event to the listeners
   * @param {String} event
   * @param {Object} data
   */
  emit(event, data) {
    // we also want to trigger dom events
    if (this.options.domEvents) {
      triggerDomEvent(event, data);
    }

    // no handlers, so skip it all
    let handlers = this.handlers[event] && this.handlers[event].slice();
    if (!handlers || !handlers.length) {
      return;
    }

    data.type = event;
    data.preventDefault = function() {
      data.srcEvent.preventDefault();
    };

    let i = 0;
    while (i < handlers.length) {
      handlers[i](data);
      i++;
    }
  }

  /**
   * @private
   * destroy the manager and unbinds all events
   * it doesn't unbind dom events, that is the user own responsibility
   */
  destroy() {
    this.element && toggleCssProps(this, false);

    this.handlers = {};
    this.session = {};
    this.input.destroy();
    this.element = null;
  }
}

/**
 * @private
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
  let { element } = manager;
  if (!element.style) {
    return;
  }
  let prop;
  each(manager.options.cssProps, (value, name) => {
    prop = prefixed(element.style, name);
    if (add) {
      manager.oldCssProps[prop] = element.style[prop];
      element.style[prop] = value;
    } else {
      element.style[prop] = manager.oldCssProps[prop] || '';
    }
  });
  if (!add) {
    manager.oldCssProps = {};
  }
}

/**
 * @private
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
  let gestureEvent = document.createEvent('Event');
  gestureEvent.initEvent(event, true, true);
  gestureEvent.gesture = data;
  data.target.dispatchEvent(gestureEvent);
}
