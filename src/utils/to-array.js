/**
 * @private
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
export default function toArray(obj) {
  return Array.prototype.slice.call(obj, 0);
}
