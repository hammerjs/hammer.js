/**
 * 
 * Created by arjun on 20/05/16.
 */
import {each} from './each'
import {splitStr} from './splitStr'
/**
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function removeEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.removeEventListener(type, handler, false);
    });
}

export {removeEventListeners};
