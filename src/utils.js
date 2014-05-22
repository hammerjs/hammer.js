/**
 * walk objects and arrays
 * @param obj
 * @param iterator
 * @param context
 */
function each(obj, iterator, context) {
    var i, len;

    if('forEach' in obj) {
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

/**
 * simple function bind
 * @param fn
 * @param context
 * @returns {Function}
 */
function bindFn(fn, context) {
    return function() {
        return fn.apply(context, arguments);
    };
}

/**
 * addEventListener with multiple events at once
 * @param element
 * @param types
 * @param handler
 */
function addEvent(element, types, handler) {
    each(types.split(' '), function(type) {
        element.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param element
 * @param types
 * @param handler
 */
function removeEvent(element, types, handler) {
    each(types.split(' '), function(type) {
        element.removeEventListener(type, handler, false);
    });
}

/**
 * find in string
 * @param str
 * @param find
 * @returns {boolean}
 */
function inStr(str, find) {
    return str.indexOf(find) > -1;
}
