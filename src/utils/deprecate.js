/**
 * @private
 * wrap a method with a deprecation warning and stack trace
 * @param {Function} method
 * @param {String} name
 * @param {String} message
 * @returns {Function} A new function wrapping the supplied method.
 */
export default function deprecate(method, name, message) {
  let deprecationMessage = `DEPRECATED METHOD: ${name}\n${message} AT \n`;
  return function() {
    let e = new Error('get-stack-trace');
    let stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '')
        .replace(/^\s+at\s+/gm, '')
        .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';

    let log = window.console && (window.console.warn || window.console.log);
    if (log) {
      log.call(window.console, deprecationMessage, stack);
    }
    return method.apply(this, arguments);
  };
}
