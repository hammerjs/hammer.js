import {
    INPUT_START,
    INPUT_MOVE,
    INPUT_END,
    INPUT_CANCEL,
    INPUT_TYPE_TOUCH
} from '../inputjs/input-consts';
import Input from '../inputjs/input-constructor';
import toArray from '../utils/to-array';
import hasParent from '../utils/has-parent';
import uniqueArray from '../utils/unique-array';

const TOUCH_INPUT_MAP = {
  touchstart: INPUT_START,
  touchmove: INPUT_MOVE,
  touchend: INPUT_END,
  touchcancel: INPUT_CANCEL
};

const TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * @private
 * Multi-user touch events input
 * @constructor
 * @extends Input
 */
export default class TouchInput extends Input {

  constructor() {
    TouchInput.prototype.evTarget = TOUCH_TARGET_EVENTS;
    TouchInput.prototype.targetIds = {};
    super(...arguments);

    this.evTarget = TOUCH_TARGET_EVENTS;
    this.targetIds = {};
  }

  handler(ev) {
    let type = TOUCH_INPUT_MAP[ev.type];
    let touches = getTouches.call(this, ev, type);
    if (!touches) {
      return;
    }

    this.callback(this.manager, type, {
      pointers: touches[0],
      changedPointers: touches[1],
      pointerType: INPUT_TYPE_TOUCH,
      srcEvent: ev
    });
  }
}

/**
 * @private
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function getTouches(ev, type) {
  let allTouches = toArray(ev.touches);
  let { targetIds } = this;

  // when there is only one touch, the process can be simplified
  if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
    targetIds[allTouches[0].identifier] = true;
    return [allTouches, allTouches];
  }

  let i;
  let targetTouches;
  let changedTouches = toArray(ev.changedTouches);
  let changedTargetTouches = [];
  let { target } = this;

  // get target touches from touches
  targetTouches = allTouches.filter((touch) => {
    return hasParent(touch.target, target);
  });

  // collect touches
  if (type === INPUT_START) {
    i = 0;
    while (i < targetTouches.length) {
      targetIds[targetTouches[i].identifier] = true;
      i++;
    }
  }

  // filter changed touches to only contain touches that exist in the collected target ids
  i = 0;
  while (i < changedTouches.length) {
    if (targetIds[changedTouches[i].identifier]) {
      changedTargetTouches.push(changedTouches[i]);
    }

    // cleanup removed touches
    if (type & (INPUT_END | INPUT_CANCEL)) {
      delete targetIds[changedTouches[i].identifier];
    }
    i++;
  }

  if (!changedTargetTouches.length) {
    return;
  }

  return [
      // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
      uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
      changedTargetTouches
  ];
}
