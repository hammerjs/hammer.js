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
  let startSorted = start[0].identifier < start[1].identifier;
  let start0 = startSorted ? start[0] : start[1];
  let start1 = startSorted ? start[1] : start[0];
  let endSorted = end[0].identifier < end[1].identifier;
  let end0 = endSorted ? end[0] : end[1];
  let end1 = endSorted ? end[1] : end[0];
  return getAngle(end0, end1, PROPS_CLIENT_XY) - getAngle(start0, start1, PROPS_CLIENT_XY);
}
