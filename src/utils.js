var VENDOR_PREFIXES = ['', 'webkit', 'moz', 'MS', 'ms', 'o'];

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

    if(obj.forEach) {
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
 * @param {Function} base
 * @param {Object} [properties]
 */
function inherit(child, base, properties) {
    var baseP = base.prototype,
        childP;

    // object create is supported since IE9
    if(Object.create) {
        childP = child.prototype = Object.create(baseP);
        childP.constructor = child;
    } else {
        extend(child, parent);
        var Inherited = function() {
            this.constructor = child;
        };
        Inherited.prototype = baseP;
        childP = child.prototype = new Inherited();
    }

    if(properties) {
        extend(childP, properties);
    }

    childP._super = baseP;
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
function addEventListeners(element, types, handler) {
    each(splitStr(types), function(type) {
        element.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param {HTMLElement} element
 * @param {String} types
 * @param {Function} handler
 */
function removeEventListeners(element, types, handler) {
    each(splitStr(types), function(type) {
        element.removeEventListener(type, handler, false);
    });
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
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

/**
 * find if a array contains the object using indexOf or a simple polyFill
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
 * unique array with objects based on a key (like 'id')
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} key
 * @returns {Array} [{id:1},{id:2}]
 */
function uniqueArray(src, key) {
    var results = [];
    var values = [];
    for(var i = 0, len = src.length; i < len; i++) {
        if(inArray(values, src[i][key]) < 0) {
            results.push(src[i]);
        }
        values[i] = src[i][key];
    }
    return results;
}

/**
 * get/set (vendor prefixed) property value. allows css properties, properties and functions.
 * if you want to call a function by this function, you should pass an array with arguments (see .apply())
 * else, a bindFn function will be returned
 *
 * @param {Object} obj
 * @param {String} property
 * @param {*} [val]
 * @returns {*|Undefined} val
 */
function prefixed(obj, property, val) {
    var prop = prefixedName(obj, property);
    if(!prop) {
        return;
    } else if(typeof obj[prop] == TYPE_FUNCTION) {
        if(typeof val == TYPE_UNDEFINED) {
            return bindFn(obj[prop], obj);
        }
        return obj[prop].apply(obj, val);
    } else if(val) {
        obj[prop] = val;
    }
    return obj[prop];
}

/**
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */
function prefixedName(obj, property) {
    var prefix, prop, i;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    for(i = 0; i < VENDOR_PREFIXES.length; i++) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if(prop in obj) {
            return prop;
        }
    }
    return;
}
