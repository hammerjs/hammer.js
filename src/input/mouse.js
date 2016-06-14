import {
    INPUT_START,
    INPUT_MOVE,
    INPUT_END,
    INPUT_TYPE_MOUSE
} from '../inputjs/input-consts';
import { Input } from '../inputjs/input-constructor';
import inherit from '../utils/inherit';

const MOUSE_INPUT_MAP = {
  mousedown: INPUT_START,
  mousemove: INPUT_MOVE,
  mouseup: INPUT_END
};

const MOUSE_ELEMENT_EVENTS = 'mousedown';
const MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

/**
 * @private
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
  this.evEl = MOUSE_ELEMENT_EVENTS;
  this.evWin = MOUSE_WINDOW_EVENTS;

  this.pressed = false; // mousedown state

  Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
  /**
   * @private
   * handle mouse events
   * @param {Object} ev
   */
  handler: function MEhandler(ev) {
    let eventType = MOUSE_INPUT_MAP[ev.type];

    // on start we want to have the left mouse button down
    if (eventType & INPUT_START && ev.button === 0) {
      this.pressed = true;
    }

    if (eventType & INPUT_MOVE && ev.which !== 1) {
      eventType = INPUT_END;
    }

    // mouse must be down
    if (!this.pressed) {
      return;
    }

    if (eventType & INPUT_END) {
      this.pressed = false;
    }

    this.callback(this.manager, eventType, {
      pointers: [ev],
      changedPointers: [ev],
      pointerType: INPUT_TYPE_MOUSE,
      srcEvent: ev
    });
  }
});

export { MouseInput };
