/**
 * Created by arjun on 20/05/16.
 */

/**
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

export {splitStr};