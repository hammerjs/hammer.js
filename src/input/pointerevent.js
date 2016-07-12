import {
    INPUT_START,
    INPUT_END,
    INPUT_CANCEL,
    INPUT_MOVE,
    INPUT_TYPE_TOUCH,
    INPUT_TYPE_MOUSE,
    INPUT_TYPE_PEN,
    INPUT_TYPE_KINECT
} from '../inputjs/input-consts';
import Input from '../inputjs/input-constructor';
import inArray from '../utils/in-array';

const POINTER_INPUT_MAP = {
  pointerdown: INPUT_START,
  pointermove: INPUT_MOVE,
  pointerup: INPUT_END,
  pointercancel: INPUT_CANCEL,
  pointerout: INPUT_CANCEL
};

// in IE10 the pointer types is defined as an enum
const IE10_POINTER_TYPE_ENUM = {
  2: INPUT_TYPE_TOUCH,
  3: INPUT_TYPE_PEN,
  4: INPUT_TYPE_MOUSE,
  5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
};

let POINTER_ELEMENT_EVENTS = 'pointerdown';
let POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

// IE10 has prefixed support, and case-sensitive
if (window.MSPointerEvent && !window.PointerEvent) {
  POINTER_ELEMENT_EVENTS = 'MSPointerDown';
  POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
}

/**
 * @private
 * Pointer events input
 * @constructor
 * @extends Input
 */
export default class PointerEventInput extends Input {
  constructor() {
    super(...arguments);
    this.evEl = POINTER_ELEMENT_EVENTS;
    this.evWin = POINTER_WINDOW_EVENTS;

    this.store = (this.manager.session.pointerEvents = []);
  }

  /**
   * @private
   * handle mouse events
   * @param {Object} ev
   */
  handler(ev) {
    let { store } = this;
    let removePointer = false;

    let eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
    let eventType = POINTER_INPUT_MAP[eventTypeNormalized];
    let pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

    let isTouch = (pointerType === INPUT_TYPE_TOUCH);

    // get index of the event in the store
    let storeIndex = inArray(store, ev.pointerId, 'pointerId');

    // start and mouse must be down
    if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
      if (storeIndex < 0) {
        store.push(ev);
        storeIndex = store.length - 1;
      }
    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
      removePointer = true;
    }

    // it not found, so the pointer hasn't been down (so it's probably a hover)
    if (storeIndex < 0) {
      return;
    }

    // update the event in the store
    store[storeIndex] = ev;

    this.callback(this.manager, eventType, {
      pointers: store,
      changedPointers: [ev],
      pointerType,
      srcEvent: ev
    });

    if (removePointer) {
      // remove from the store
      store.splice(storeIndex, 1);
    }
  }
}
