/**
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
    var i, len;

    if("forEach" in obj) {
        obj.forEach(iterator, context);
    } else if(obj.length !== undefined) {
        for(i = 0, len = obj.length; i < len; i++) {
            if(iterator.call(context, obj[i], i, obj) === false) {
                return;
            }
        }
    } else {
        for(i in obj) {
            if(obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj) === false) {
                return;
            }
        }
    }
}

function extend(dest, src) {
    for(var key in src) {
        if(!src.hasOwnProperty(key)) {
            continue;
        }
        dest[key] = src[key];
    }
    return dest;
}

/**
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
function bindFn(fn, context) {
    return function() {
        return fn.apply(context, arguments);
    };
}

/**
 * addEventListener with multiple events at once
 * @param {HTMLElement} element
 * @param {String} types
 * @param {Function} handler
 */
function addEvent(element, types, handler) {
    each(types.split(" "), function(type) {
        element.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param {HTMLElement} element
 * @param {String} types
 * @param {Function} handler
 */
function removeEvent(element, types, handler) {
    each(types.split(" "), function(type) {
        element.removeEventListener(type, handler, false);
    });
}

/**
 * find in string
 * @param {String} str
 * @param {String} find
 * @returns {boolean}
 */
function inStr(str, find) {
    return str.indexOf(find) > -1;
}

/**
 * find if a array contains the object using indexOf or a simple polyfill
 * @param {Array} src
 * @param {String} find
 * @param {String} [findByKey]
 * @return {Boolean|Number} false when not found, or the index
 */
function inArray(src, find, findByKey) {
    if(src.indexOf && !findByKey) {
        return src.indexOf(find);
    } else {
        for(var i = 0, len = src.length; i < len; i++) {
            if((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
                return i;
            }
        }
        return -1;
    }
}

/**
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
function toArray(obj) {
    return Array.prototype.slice.call(obj, 0);
}

/**
 * unique array based on a key (like "id")
 * @param {Array} src
 * @param {String} key
 * @returns {Array}
 */
function uniqueArray(src, key) {
    var results = [];
    var keys = [];

    each(src, function(item) {
        if(inArray(keys, item[key]) < 0) {
            results.push(item);
        }
        keys.push(item[key]);
    });

    return results;
}
