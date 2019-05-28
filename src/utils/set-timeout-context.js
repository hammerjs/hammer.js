import bindFn from './bind-fn';

/**
 * @private
 * set a timeout with a given scope
 * @param {Function} fn
 * @param {Number} timeout
 * @param {Object} context
 * @returns {number}
 */
export default function setTimeoutContext(fn, timeout, context) {
  if (timeout === 0) {
    fn.call(context);
    return null;
  } else {
    return setTimeout(bindFn(fn, context), timeout);
  }
}
