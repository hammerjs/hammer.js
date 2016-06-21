import each from './each';
import splitStr from './split-str';
/**
 * @private
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
export default function removeEventListeners(target, types, handler) {
  each(splitStr(types), (type) => {
    target.removeEventListener(type, handler, false);
  });
}
