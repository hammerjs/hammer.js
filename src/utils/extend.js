import deprecate from './deprecate';
/**
 * @private
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge=false]
 * @returns {Object} dest
 */
const extend = deprecate((dest, src, merge) => {
  let keys = Object.keys(src);
  let i = 0;
  while (i < keys.length) {
    if (!merge || (merge && dest[keys[i]] === undefined)) {
      dest[keys[i]] = src[keys[i]];
    }
    i++;
  }
  return dest;
}, 'extend', 'Use `assign`.');

export default extend;
