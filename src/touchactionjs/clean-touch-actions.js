import inStr from '../utils/in-str';
import {
    TOUCH_ACTION_NONE,
    TOUCH_ACTION_PAN_X,
    TOUCH_ACTION_PAN_Y,
    TOUCH_ACTION_MANIPULATION,
    TOUCH_ACTION_AUTO
} from './touchaction-Consts';

/**
 * @private
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */
export default function cleanTouchActions(actions) {
  // none
  if (inStr(actions, TOUCH_ACTION_NONE)) {
    return TOUCH_ACTION_NONE;
  }

  let hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
  let hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

  // if both pan-x and pan-y are set (different recognizers
  // for different directions, e.g. horizontal pan but vertical swipe?)
  // we need none (as otherwise with pan-x pan-y combined none of these
  // recognizers will work, since the browser would handle all panning
  if (hasPanX && hasPanY) {
    return TOUCH_ACTION_NONE;
  }

  // pan-x OR pan-y
  if (hasPanX || hasPanY) {
    return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
  }

  // manipulation
  if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
    return TOUCH_ACTION_MANIPULATION;
  }

  return TOUCH_ACTION_AUTO;
}
