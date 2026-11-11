import getAngle from './get-angle';
import { PROPS_CLIENT_XY } from './input-consts';

/**
 * @private
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
export default function getRotation(start, end) {
  let angle = getAngle(end[1], end[0], PROPS_CLIENT_XY) - getAngle(start[1], start[0], PROPS_CLIENT_XY);
  if (angle > 180) {
    return angle - 360;
  }
  if (angle < -180) {
    return angle + 360;
  }
  return angle;
}
