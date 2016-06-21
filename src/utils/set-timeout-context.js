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
  return setTimeout(bindFn(fn, context), timeout);
}
