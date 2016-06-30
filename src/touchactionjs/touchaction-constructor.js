import {
    TOUCH_ACTION_COMPUTE,
    TOUCH_ACTION_MAP,
    NATIVE_TOUCH_ACTION,
    PREFIXED_TOUCH_ACTION,
    TOUCH_ACTION_NONE,
    TOUCH_ACTION_PAN_X,
    TOUCH_ACTION_PAN_Y
} from './touchaction-Consts';
import {
    DIRECTION_VERTICAL,
    DIRECTION_HORIZONTAL
} from '../inputjs/input-consts';
import each from '../utils/each';
import boolOrFn from '../utils/bool-or-fn';
import inStr from '../utils/in-str';
import cleanTouchActions from './clean-touch-actions';

/**
 * @private
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */
export default class TouchAction {
  constructor(manager, value) {
    this.manager = manager;
    this.set(value);
  }

  /**
   * @private
   * set the touchAction value on the element or enable the polyfill
   * @param {String} value
   */
  set(value) {
    // find out the touch-action by the event handlers
    if (value === TOUCH_ACTION_COMPUTE) {
      value = this.compute();
    }

    if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
      this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
    }
    this.actions = value.toLowerCase().trim();
  }

  /**
   * @private
   * just re-set the touchAction value
   */
  update() {
    this.set(this.manager.options.touchAction);
  }

  /**
   * @private
   * compute the value for the touchAction property based on the recognizer's settings
   * @returns {String} value
   */
  compute() {
    let actions = [];
    each(this.manager.recognizers, (recognizer) => {
      if (boolOrFn(recognizer.options.enable, [recognizer])) {
        actions = actions.concat(recognizer.getTouchAction());
      }
    });
    return cleanTouchActions(actions.join(' '));
  }

  /**
   * @private
   * this method is called on each input cycle and provides the preventing of the browser behavior
   * @param {Object} input
   */
  preventDefaults(input) {
    let { srcEvent } = input;
    let direction = input.offsetDirection;

    // if the touch action did prevented once this session
    if (this.manager.session.prevented) {
      srcEvent.preventDefault();
      return;
    }

    let { actions } = this;
    let hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
    let hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
    let hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

    if (hasNone) {
      // do not prevent defaults if this is a tap gesture
      let isTapPointer = input.pointers.length === 1;
      let isTapMovement = input.distance < 2;
      let isTapTouchTime = input.deltaTime < 250;

      if (isTapPointer && isTapMovement && isTapTouchTime) {
        return;
      }
    }

    if (hasPanX && hasPanY) {
      // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
      return;
    }

    if (hasNone ||
        (hasPanY && direction & DIRECTION_HORIZONTAL) ||
        (hasPanX && direction & DIRECTION_VERTICAL)) {
      return this.preventSrc(srcEvent);
    }
  }

  /**
   * @private
   * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
   * @param {Object} srcEvent
   */
  preventSrc(srcEvent) {
    this.manager.session.prevented = true;
    srcEvent.preventDefault();
  }
}
