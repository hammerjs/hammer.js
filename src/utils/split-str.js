/**
 * @private
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */

export default function splitStr(str) {
  let trimmed = str.trim();
  return trimmed ? trimmed.split(/\s+/g) : [];
}
