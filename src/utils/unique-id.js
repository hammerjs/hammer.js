/**
 * @private
 * get a unique id
 * @returns {number} uniqueId
 */
let _uniqueId = 1;
export default function uniqueId() {
  return _uniqueId++;
}
