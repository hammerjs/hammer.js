import deprecate from './deprecate';
import extend from './extend';
/**
 * @private
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
const merge = deprecate((dest, src) => {
  return extend(dest, src, true);
}, 'merge', 'Use `assign`.');

export default merge;
