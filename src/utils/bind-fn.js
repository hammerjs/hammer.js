/**
 * @private
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
export default function bindFn(fn, context) {
  return function boundFn() {
    return fn.apply(context, arguments);
  };
}
