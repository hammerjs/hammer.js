var VENDOR_PREFIXES = ['', 'webkit', 'moz', 'MS', 'ms'];

var TYPE_FUNCTION = 'function';
var TYPE_UNDEFINED = 'undefined';

/**
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
    var i, len;

    if('forEach' in obj) {
        obj.forEach(iterator, context);
    } else if(typeof obj.length !== TYPE_UNDEFINED) {
        for(i = 0, len = obj.length; i < len; i++) {
            iterator.call(context, obj[i], i, obj);
        }
    } else {
        for(i in obj) {
            obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
        }
    }
}

/**
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
function merge(dest, src) {
    for(var key in src) {
        if(src.hasOwnProperty(key) && typeof dest[key] == TYPE_UNDEFINED) {
            dest[key] = src[key];
        }
    }
    return dest;
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
function extend(dest, src) {
    for(var key in src) {
        if(src.hasOwnProperty(key)) {
            dest[key] = src[key];
        }
    }
    return dest;
}

/**
 * simple class inheritance
 * @param {Function} child
 * @param {Function} parent
 * @param {Object} [methods]
 */
function inherit(child, parent, methods) {
    extend(child, parent);

    function Inherited() {
        this.constructor = child;
    }
    Inherited.prototype = parent.prototype;
    child.prototype = new Inherited();

    if(methods) {
        extend(child.prototype, methods);
    }
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
    each(types.split(' '), function(type) {
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
    each(types.split(' '), function(type) {
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
 * simple wrapper around math.round
 * @param {Number} number
 * @returns {number}
 */
function round(number) {
    return Math.round(number);
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
 * unique array based on a key (like 'id')
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

/**
 * get/set (vendor prefixed) property. allows css properties, properties and functions.
 * if you want to call a function by this function, you should pass an array with arguments (see .apply())
 * else, a bindFn function will be returned
 *
 * @param {Object} obj
 * @param {String} property
 * @param {*} [val]
 * @returns {*}
 */
function prefixed(obj, property, val) {
    var prefix, prop, i;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    for(i = 0; i < VENDOR_PREFIXES.length; i++) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if(!(prop in obj)) {
            continue;
        } else if(typeof obj[prop] == TYPE_FUNCTION) {
            return (typeof val == TYPE_UNDEFINED) ? bindFn(prop, obj) : obj[prop].apply(obj, val);
        } else if(val) {
            obj[prop] = val;
            return prop;
        } else {
            return prop;
        }
    }
    return false;
}
