import { PROPS_XY } from './input-consts';

/**
 * @private
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */
export default function getAngle(p1, p2, props) {
  if (!props) {
    props = PROPS_XY;
  }
  let x = p2[props[0]] - p1[props[0]];
  let y = p2[props[1]] - p1[props[1]];
  return Math.atan2(y, x) * 180 / Math.PI;
}
