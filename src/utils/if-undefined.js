/**
 * @private
 * use the val2 when val1 is undefined
 * @param {*} val1
 * @param {*} val2
 * @returns {*}
 */
export default function ifUndefined(val1, val2) {
  return (val1 === undefined) ? val2 : val1;
}
