/**
 * Created by arjun on 20/05/16.
 */

/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
    return _uniqueId++;
}

export {uniqueId};