import { PROPS_XY } from './input-consts';

/**
 * @private
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
export default function getDistance(p1, p2, props) {
  if (!props) {
    props = PROPS_XY;
  }
  let x = p2[props[0]] - p1[props[0]];
  let y = p2[props[1]] - p1[props[1]];

  return Math.sqrt((x * x) + (y * y));
}
