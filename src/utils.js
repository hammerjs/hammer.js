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

function bindFn(fn, context) {
    return function() {
        return fn.apply(context, arguments);
    };
}

function addEvent(element, types, handler) {
    each(types.split(' '), function(type) {
        element.addEventListener(type, handler, false);
    });
}

function removeEvent(element, types, handler) {
    each(types.split(' '), function(type) {
        element.removeEventListener(type, handler, false);
    });
}

function inStr(str, find) {
    return str.indexOf(find) > -1;
}
