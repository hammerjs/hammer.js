/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
export default function uniqueId() {
  return _uniqueId++;
}
