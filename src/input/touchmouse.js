import Input from '../inputjs/input-constructor';
import bindFn from '../utils/bind-fn';
import  TouchInput  from './touch';
import  MouseInput  from './mouse';
import {
    INPUT_START,
    INPUT_END,
    INPUT_CANCEL,
    INPUT_TYPE_TOUCH,
    INPUT_TYPE_MOUSE
} from '../inputjs/input-consts';

/**
 * @private
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 * @extends Input
 */

const DEDUP_TIMEOUT = 2500;
const DEDUP_DISTANCE = 25;

export default class TouchMouseInput extends Input {
  constructor() {
    super(...arguments);

    let handler = bindFn(this.handler, this);
    this.touch = new TouchInput(this.manager, handler);
    this.mouse = new MouseInput(this.manager, handler);

    this.primaryTouch = null;
    this.lastTouches = [];
  }

  /**
   * @private
   * handle mouse and touch events
   * @param {Hammer} manager
   * @param {String} inputEvent
   * @param {Object} inputData
   */
  handler(manager, inputEvent, inputData) {
    let isTouch = (inputData.pointerType === INPUT_TYPE_TOUCH);
    let isMouse = (inputData.pointerType === INPUT_TYPE_MOUSE);

    if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
      return;
    }

    // when we're in a touch event, record touches to  de-dupe synthetic mouse event
    if (isTouch) {
      recordTouches.call(this, inputEvent, inputData);
    } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
      return;
    }

    this.callback(manager, inputEvent, inputData);
  }

  /**
   * @private
   * remove the event listeners
   */
  destroy() {
    this.touch.destroy();
    this.mouse.destroy();
  }
}

function recordTouches(eventType, eventData) {
  if (eventType & INPUT_START) {
    this.primaryTouch = eventData.changedPointers[0].identifier;
    setLastTouch.call(this, eventData);
  } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
    setLastTouch.call(this, eventData);
  }
}

function setLastTouch(eventData) {
  let { changedPointers:[touch] } = eventData;
  if (touch.identifier === this.primaryTouch) {
    let lastTouch = { x: touch.clientX, y: touch.clientY };
    this.lastTouches.push(lastTouch);
    let lts = this.lastTouches;
    let removeLastTouch = function() {
      let i = lts.indexOf(lastTouch);
      if (i > -1) {
        lts.splice(i, 1);
      }
    };
    setTimeout(removeLastTouch, DEDUP_TIMEOUT);
  }
}

function isSyntheticEvent(eventData) {
  let x = eventData.srcEvent.clientX;
  let y = eventData.srcEvent.clientY;
  for (let i = 0; i < this.lastTouches.length; i++) {
    let t = this.lastTouches[i];
    let dx = Math.abs(x - t.x);
    let dy = Math.abs(y - t.y);
    if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
      return true;
    }
  }
  return false;
}
