(function(window, undefined) {
  'use strict';

/**
 * create an manager with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    var manager = new Manager(element, options);

    /**
     * setup recognizers
     * the defauls.recognizers contains an array like this;
     * [ RecognizerClass, options, recognizeWith ],
     * [ .... ]
     */
    each(manager.options.recognizers, function(item) {
        var recognizer = manager.add(new (item[0])(item[1]));
        if(item[2]) {
            recognizer.recognizeWith(item[2]);
        }
    });

    return manager;
}

Hammer.VERSION = '2.0.0dev';

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
    } else if(obj.length !== undefined) {
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
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge]
 * @returns {Object} dest
 */
function extend(dest, src, merge) {
    for(var key in src) {
        if(src.hasOwnProperty(key) && (!merge || (merge && dest[key] === undefined))) {
            dest[key] = src[key];
        }
    }
    return dest;
}

/**
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
function merge(dest, src) {
    return extend(dest, src, true);
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
 * let a boolean value also be a function that must return a boolean
 * @param {Boolean|Function} val
 * @param {Object} [context]
 * @param {Array} [args]
 * @returns {Boolean}
 */
function boolOrFn(val, context, args) {
    if(typeof val == TYPE_FUNCTION) {
        return val.apply(context, args);
    }
    return val;
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
 * find if a node is in the given parent
 * @method hasParent
 * @param {HTMLElement} node
 * @param {HTMLElement} parent
 * @return {Boolean} found
 */
function hasParent(node, parent) {
    while(node) {
        if(node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

/**
 * store Math.round in a var, for better minimisation
 */
var round = Math.round;

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
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */
function prefixed(obj, property) {
    var prefix, prop, i;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    for(i = 0; i < VENDOR_PREFIXES.length; i++) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if(prop in obj) {
            return prop;
        }
    }
    return undefined;
}

/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
    return _uniqueId++;
}

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
var SUPPORT_TOUCH = ('ontouchstart' in window);
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';

var COMPUTE_INTERVAL = 50;

var INPUT_START = 1;
var INPUT_MOVE = 2;
var INPUT_END = 4;
var INPUT_CANCEL = 8;

var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;

var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;

var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
function Input(manager, callback) {
    var self = this;
    this.manager = manager;
    this.callback = callback;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
        if(boolOrFn(self.manager.options.enable, self.manager)) {
            self.handler(ev);
        }
    };

    this.elEvents && addEventListeners(this.manager.element, this.elEvents, this.domHandler);
    this.winEvents && addEventListeners(window, this.winEvents, this.domHandler);
}

Input.prototype = {
    destroy: function() {
        this.elEvents && removeEventListeners(this.manager.element, this.elEvents, this.domHandler);
        this.winEvents && removeEventListeners(window, this.winEvents, this.domHandler);
    }
};

/**
 * create new input type manager
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    if(SUPPORT_POINTER_EVENTS) {
        Type = PointerEventInput;
    } else if(SUPPORT_ONLY_TOUCH) {
        Type = TouchInput;
    } else if(!SUPPORT_TOUCH) {
        Type = MouseInput;
    } else {
        Type = TouchMouseInput;
    }
    return new (Type)(manager, inputHandler);
}

/**
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(manager, eventType, input) {
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;
    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType & INPUT_END && (pointersLen - changedPointersLen === 0));

    input.isFirst = isFirst;
    input.isFinal = isFinal;

    if(isFirst) {
        manager.session = {};
    }
    // source event is the normalized value of the events like 'touchstart, touchend, touchcancel, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(manager, input);

    manager.recognize(input);
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */
function computeInputData(manager, input) {
    var session = manager.session;
    var pointers = input.pointers;
    var pointersLength = pointers.length;

    // store the first input to calculate the distance and direction
    if(!session.firstInput) {
        session.firstInput = simpleCloneInputData(input);
    }

    // to compute scale and rotation we need to store the multiple touches
    if(pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(input);
    } else if(pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;
    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;
    var center = getCenter(pointers);

    input.center = center;
    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);
    input.direction = getDirection(offsetCenter, center);

    input.timeStamp = input.srcEvent.timeStamp;
    input.deltaTime = input.timeStamp - firstInput.timeStamp;
    input.deltaX = center.x - offsetCenter.x;
    input.deltaY = center.y - offsetCenter.y;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    // find the correct target
    var target = manager.element;
    if(hasParent(input.srcEvent.target, target)) {
        target = input.srcEvent.target;
    }
    input.target = target;

    computeIntervalInputData(session, input);
}

/**
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    var last = session.lastInterval;
    if(!last) {
        last = session.lastInterval = simpleCloneInputData(input);
    }

    var deltaTime = input.timeStamp - last.timeStamp;

    if(deltaTime > COMPUTE_INTERVAL || !last.velocity) {
        var deltaX = input.deltaX - last.deltaX;
        var deltaY = input.deltaY - last.deltaY;

        last = session.lastInterval = simpleCloneInputData(input);
        last.velocity = getVelocity(deltaTime, deltaX, deltaY);
    }

    var velocity = last.velocity;

    input.velocity = Math.max(velocity.x, velocity.y);
    input.velocityX = velocity.x;
    input.velocityY = velocity.y;
}

/**
 * create a simple clone from the input used for storage of firstInput and firstMultiple
 * @param {Object} input
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(input) {
    // make a simple copy of the pointers because we will get a reference if we don't
    // we only need clientXY for the calculations
    var pointers = [];
    for(var i = 0; i < input.pointers.length; i++) {
        pointers[i] = {
            clientX: round(input.pointers[i].clientX),
            clientY: round(input.pointers[i].clientY)
        };
    }

    return {
        timeStamp: input.srcEvent.timeStamp,
        pointers: pointers,
        center: getCenter(pointers),
        deltaX: input.deltaX,
        deltaY: input.deltaY
    };
}

/**
 * get the center of all the pointers
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */
function getCenter(pointers) {
    var pointersLength = pointers.length;

    // no need to loop when only one touch
    if(pointersLength === 1) {
        return {
            x: round(pointers[0].clientX),
            y: round(pointers[0].clientY)
        };
    }

    var x = 0, y = 0;
    for(var i = 0; i < pointersLength; i++) {
        x += pointers[i].clientX;
        y += pointers[i].clientY;
    }

    return {
        x: round(x / pointersLength),
        y: round(y / pointersLength)
    };
}

/**
 * calculate the velocity between two points. unit is in px per ms.
 * @param {Number} deltaTime
 * @param {Number} deltaX
 * @param {Number} deltaY
 * @return {Object} velocity `x` and `y`
 */
function getVelocity(deltaTime, deltaX, deltaY) {
    return {
        x: Math.abs(deltaX / deltaTime) || 0,
        y: Math.abs(deltaY / deltaTime) || 0
    };
}

/**
 * get the direction between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @return {Number} direction
 */
function getDirection(p1, p2) {
    var x = p1.x - p2.x,
        y = p1.y - p2.y;

    // no direction because the positions are equal
    if(x === y) {
        return DIRECTION_NONE;
    }

    if(Math.abs(x) >= Math.abs(y)) {
        return x > 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y > 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
function getDistance(p1, p2, props) {
    if(!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];
    return Math.sqrt((x * x) + (y * y));
}

/**
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */
function getAngle(p1, p2, props) {
    if(!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];
    return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
function getRotation(start, end) {
    return getAngle(end[1], end[0], PROPS_CLIENT_XY) - getAngle(start[1], start[0], PROPS_CLIENT_XY);
}

/**
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END,
    mouseout: INPUT_CANCEL
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseout mouseup';

/**
 * Mouse events input
 * @constructor
 */
function MouseInput() {
    this.elEvents = MOUSE_ELEMENT_EVENTS;
    this.winEvents = MOUSE_WINDOW_EVENTS;

    this.allow = true; // used by Input.TouchMouse to disable mouse events
    this.pressed = false; // mousedown state

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function(ev) {
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want to have the left mouse button down
        if(eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
        }

        // mouse must be down, and mouse events are allowed (see the TouchMouse input)
        if(!this.pressed || !this.allow) {
            return;
        }

        // out of the window?
        var target = ev.relatedTarget || ev.toElement;
        if(ev.type == 'mouseout' && target.nodeName != 'HTML') {
            eventType = INPUT_MOVE;
        }

        if(eventType & (INPUT_END | INPUT_CANCEL)) {
            this.pressed = false;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    },
});

var POINTER_INPUT_MAP = {
    pointerdown: INPUT_START,
    pointermove: INPUT_MOVE,
    pointerup: INPUT_END,
    pointercancel: INPUT_CANCEL,
    pointerout: INPUT_CANCEL
};

// in IE10 the pointer types are defined as integers
var IE10_POINTER_TYPE_MAP = {
    2: INPUT_TYPE_TOUCH,
    3: INPUT_TYPE_PEN,
    4: INPUT_TYPE_MOUSE
};

var POINTER_ELEMENT_EVENTS = 'pointerdown pointermove pointerup pointercancel';
var POINTER_WINDOW_EVENTS = 'pointerout';

// IE10 has prefixed support, and case-sensitive
if(window.MSPointerEvent) {
    POINTER_ELEMENT_EVENTS = 'MSPointerDown MSPointerMove MSPointerUp MSPointerCancel';
    POINTER_WINDOW_EVENTS = 'MSPointerOut';
}

/**
 * Pointer events input
 * @constructor
 */
function PointerEventInput() {
    this.elEvents = POINTER_ELEMENT_EVENTS;
    this.winEvents = POINTER_WINDOW_EVENTS;

    Input.apply(this, arguments);

    this.store = (this.manager.session.pointerEvents = []);
}

inherit(PointerEventInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function(ev) {
        var store = this.store;
        var removePointer = false;

        var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
        var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
        var pointerType = IE10_POINTER_TYPE_MAP[ev.pointerType] || ev.pointerType;

        // out of the window?
        var target = ev.relatedTarget || ev.toElement || ev.target;
        if(eventTypeNormalized == 'pointerout' && target.nodeName != 'HTML') {
            eventType = INPUT_MOVE;
        }

        // start and mouse must be down
        if(eventType & INPUT_START && (ev.button === 0 || pointerType == INPUT_TYPE_TOUCH)) {
            store.push(ev);
        } else if(eventType & (INPUT_END | INPUT_CANCEL)) {
            removePointer = true;
        }

        // get index of the event in the store
        // it not found, so the pointer hasn't been down (so it's probably a hover)
        var storeIndex = inArray(store, ev.pointerId, 'pointerId');
        if(storeIndex < 0) {
            return;
        }

        // update the event in the store
        store[storeIndex] = ev;

        this.callback(this.manager, eventType, {
            pointers: store,
            changedPointers: [ev],
            pointerType: pointerType,
            srcEvent: ev
        });

        if(removePointer) {
            // remove from the store
            store.splice(storeIndex, 1);
        }
    }
});

var TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var TOUCH_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 */
function TouchInput() {
    this.elEvents = TOUCH_EVENTS;

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    /**
     * handle touch events
     * @param {Object} ev
     */
    handler: function(ev) {
        var touches = normalizeTouches(ev);
        this.callback(this.manager, TOUCH_INPUT_MAP[ev.type], {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * make sure all browsers return the same touches
 * @param {Object} ev
 * @returns {Array} [all, changed]
 */
function normalizeTouches(ev) {
    var changedTouches = toArray(ev.changedTouches);
    var touches = toArray(ev.touches).concat(changedTouches);

    return [
        // should contain all the touches, touches + changedTouches
        uniqueArray(touches, 'identifier'),
        // should contain only the touches that have changed
        changedTouches
    ];
}

/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 */
function TouchMouseInput() {
    Input.apply(this, arguments);

    this._handler = bindFn(this.handler, this);
    this.touch = new TouchInput(this.manager, this._handler);
    this.mouse = new MouseInput(this.manager, this._handler);
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function(manager, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        // when we're in a touch event, so  block all upcoming mouse events
        // most mobile browser also emit mouseevents, right after touchstart
        if(isTouch) {
            this.mouse.allow = false;
        } else if(isMouse && !this.mouse.allow) {
            return;
        }

        // reset the allowMouse when we're done
        if(inputEvent & (INPUT_END | INPUT_CANCEL)) {
            this.mouse.allow = true;
        }

        this.callback(manager, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});

/**
 * Event emitter
 * @constructor
 * @param {HTMLElement} element
 * @param {Boolean} domEvents trigger domEvents (which is slower than a regular function callback)
 */
function EventEmitter(element, domEvents) {
    this.element = element;
    this.domEvents = domEvents;

    /**
     * contains handlers, grouped by event name
     * 'swipe': [Function, Function, ...],
     * 'press': [Function, Function, ...]
     * @type {{}}
     */
    this.handlers = {};
}

EventEmitter.prototype = {
    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        });
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} events
     * @param {Function} [handler]
     * @returns {EventEmitter} this
     */
    off: function(events, handler) {
        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if(!handler) {
                delete handlers[event];
            } else {
                handlers[event].splice(inArray(handlers[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * removes all events handlers
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.handlers = {};
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit : function(event, data) {
        // we also want to trigger dom events
        if(this.domEvents) {
            triggerDomEvent(event, data);
        }

        // no handlers, so skip it all
        var handlers = this.handlers[event];
        if(!handlers || !handlers.length) {
            return;
        }

        data.type = event;
        data.preventDefault = function() {
            data.srcEvent.preventDefault();
        };

        for(var i = 0; i < handlers.length; i++) {
            handlers[i](data);
        }
    }
};

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent = document.createEvent('Event');
    gestureEvent.initEvent(event, true, true);
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}

var PREFIXED_TOUCH_ACTION = prefixed(document.body.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    set: function(value) {
        if(NATIVE_TOUCH_ACTION) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
        }
        this.actions = splitStr(value.toLowerCase());
    },

    update: function(input) {
        // not needed with native support for the touchAction property
        if(NATIVE_TOUCH_ACTION) {
            return;
        }

        var srcEvent = input.srcEvent;
        var direction = input.direction;

        // if the touch action did prevented once this session
        if(this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        var actions = this.actions;
        for(var i = 0; i < actions.length; i++) {
            if(actions[i] == 'none') {
                this.prevent(srcEvent);
            } else if(actions[i] == 'pan-y' && direction & DIRECTION_HORIZONTAL) {
                this.prevent(srcEvent);
            } else if(actions[i] == 'pan-x' && direction & DIRECTION_VERTICAL) {
                this.prevent(srcEvent);
            }
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    prevent: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};

/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    options = options || {};

    // get the touchAction style property value when option.touchAction is empty
    // otherwise the defaults.touchAction value is used
    options.touchAction = options.touchAction || element.style.touchAction || undefined;

    this.options = merge(options, Hammer.defaults);

    EventEmitter.call(this, element, this.options.domEvents);

    this.session = {};
    this.recognizers = [];

    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);
}

Hammer.defaults = {
    // when set to true, dom events are being triggered.
    // but this is slower and unused by simple implementations, so disabled by default.
    domEvents: false,

    // default value is used when a touch-action isn't defined on the element style
    touchAction: 'pan-y',

    enable: true,

    // default setup when calling Hammer()
    recognizers: [
        [RotateRecognizer],
        [PinchRecognizer, null, 'rotate'],
        [PanRecognizer],
        [SwipeRecognizer, null, 'pan'],
        [TapRecognizer, { event: 'doubletap', taps: 2 }],
        [TapRecognizer],
        [PressRecognizer]
    ],

    // with some style attributes you can improve the experience.
    cssProps: {
        // Disables text selection to improve the dragging gesture. When the value is `none` it also sets
        // `onselectstart=false` for IE9 on the element. Mainly for desktop browsers.
        userSelect: 'none',

        // Disable the Windows Phone grippers when pressing an element.
        touchSelect: 'none',

        // Disables the default callout shown when you touch and hold a touch target.
        // On iOS, when you touch and hold a touch target such as a link, Safari displays
        // a callout containing information about the link. This property allows you to disable that callout.
        touchCallout: 'none',

        // Specifies whether zooming is enabled. Used by IE10>
        contentZooming: 'none',

        // Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
        userDrag: 'none',

        // Overrides the highlight color shown when the user taps a link or a JavaScript
        // clickable element in iOS. This property obeys the alpha value, if specified.
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};

inherit(Manager, EventEmitter, {
    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired
     */
    stop: function() {
        this.session.stopped = true;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        if(this.session.stopped) {
            return;
        }

        this.touchAction.update(inputData);

        var recognizer;
        var session = this.session;
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is done, or this is a new session
        if(!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        // we're in a active recognizer
        for(var i = 0; i < this.recognizers.length; i++) {
            recognizer = this.recognizers[i];

            if(!curRecognizer || recognizer == curRecognizer || recognizer.canRecognizeWith(curRecognizer)) {
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            if(!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if(recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * @param {Recognizer} recognizer
     * @returns {Recognizer}
     */
    add: function(recognizer) {
        this.recognizers.push(recognizer);
        recognizer.manager = this;
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     */
    remove: function(recognizer) {
        var recognizers = this.recognizers;
        recognizer = this.get(recognizer);
        recognizers.splice(inArray(recognizers, recognizer), 1);
    },

    /**
     * destroy the manager and unbinds all events
     */
    destroy: function() {
        this._super.destroy.call(this);

        toggleCssProps(this, false);
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
});

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    var cssProps = manager.options.cssProps;

    each(cssProps, function(value, name) {
        element.style[prefixed(element.style, name)] = add ? value : '';
    });

    var falseFn = add && function() { return false; };
    if(cssProps.userSelect == 'none') { element.onselectstart = falseFn; }
    if(cssProps.userDrag == 'none') { element.ondragstart = falseFn; }
}

var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * Recognizer
 * @constructor
 * @param {Object} options
 */
function Recognizer(options) {
    this.id = uniqueId();

    this.manager = null;
    this.options = merge(options || {}, this.defaults);

    // default is enable true
    this.options.enable = (this.options.enable === undefined) ? true : this.options.enable;

    this.state = STATE_POSSIBLE;

    this.simultaneous = {};
    this.requireFail = {};
}

Recognizer.prototype = {
    /**
     * default emitter
     * @param {Object} input
     */
    emit: function(input) {
        this.manager.emit(this.options.event + this.stateStr(), input);
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if(!this.canRecognizeWith(otherRecognizer)) {
            this.simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * drop the simultaneous link
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRecognizeWith: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if(this.canRecognizeWith(otherRecognizer)) {
            delete this.simultaneous[otherRecognizer.id];
            otherRecognizer.dropRecognizeWith(this);
        }
        return this;
    },

    /**
     * recognizer can only run when an other is failing
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    requireFailure: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        this.requireFail.push(otherRecognizer);
        return this;
    },

    /**
     * drop the requireFailureOf link
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRequireFailure: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        var index = inArray(this.requireFail, otherRecognizer);
        if(index > -1) {
            this.requireFail.splice(index, 1);
        }
        return this;
    },

    /**
     * if the recognizer can recognize simultaneous with an other recognizer
     * @param {Recognizer} otherRecognizer
     * @returns {Boolean}
     */
    canRecognizeWith: function(otherRecognizer) {
        return !!this.simultaneous[otherRecognizer.id];
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        // require failure of other recognizers
        var canRecognize = true;
        for(var i = 0; i < this.requireFail.length; i++) {
            if(this.requireFail[i].state & STATE_FAILED) {
                canRecognize = false;
                break;
            }
        }

        // is is enabled?
        if(!canRecognize || !boolOrFn(this.options.enable, this, [inputData])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        // reset when we've reached the end
        if(this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        // get detection state
        this.state = this.test(inputData);

        // the recognizer has recognized a gesture
        // so trigger an event
        if(this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.emit(inputData);
        }
    },

    /**
     * called when the gesture has been recognized and when not allowed to
     * recognize (by the option.shouldRecognize method)
     * @virtual
     */
    reset: function() { },

    /**
     * get a usable string, used as event postfix
     * @returns {String} state
     */
    stateStr: function() {
        var state = this.state;
        if(state & STATE_CANCELLED) {
            return 'cancel';
        } else if(state & STATE_ENDED) {
            return 'end';
        } else if(state & STATE_CHANGED) {
            return '';
        } else if(state & STATE_BEGAN) {
            return 'start';
        }
        return '';
    }
};

/**
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
    var manager = recognizer.manager;
    if(manager) {
        return manager.get(otherRecognizer);
    }
    return otherRecognizer;
}

/**
 * this recognizer is just used as a base for the simple
 * pan, pinch, rotate and swipe recognizers
 * @constructor
 */
function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    defaults: {
        pointers: 1
    },

    /**
     * used to check if it the recognizer receives valid input, like input.distance > 10
     * this should be overwritten
     * @virtual
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        var optionPointers = this.options.pointers;
        return optionPointers === 0 || input.pointers.length === optionPointers;
    },

    test: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        var isValid = this.attrTest(input);

        // on cancel input and we've recognized before, return STATE_CANCELLED
        if(isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;
        } else if(isRecognized || isValid) {
            if(eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if(!(state & STATE_BEGAN)) {
                return state | STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }
        return STATE_FAILED;
    }
});

function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this._pX = null;
    this._pY = null;
}

inherit(PanRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL
    },

    attrTest: function(input) {
        var options = this.options;
        var isNew = true;

        // lock to axis
        if(!(input.direction & options.direction)) {
            var x = input.deltaX;
            var y = input.deltaY;

            if(options.direction & DIRECTION_HORIZONTAL) {
                input.direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                isNew = x != this._pX;
            } else {
                input.direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                isNew = y != this._pY;
            }
        }

        return this._super.attrTest.call(this, input) &&
            input.direction & options.direction && isNew &&
            (input.distance > options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        this._pX = input.deltaX;
        this._pY = input.deltaY;

        this._super.emit.call(this, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});

function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(1 - input.scale) > this.options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        this._super.emit.call(this, input);

        var inOut = input.scale < 1 ? 'in' : 'out';
        this.manager.emit(this.options.event + inOut, input);
    }
});

function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(PressRecognizer, Recognizer, {
    defaults: {
        event: 'press',
        pointers: 1,
        time: 500, // minimal time of the pointer to be pressed
        threshold: 10 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if(!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
        } else if(input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeout(bindFn(this.emit, this), options.time);
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        this.manager.emit(this.options.event, this._input);
    }
});

function RotateRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(1 - input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    }
});

function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    defaults: {
        event: 'swipe',
        distance: 10,
        velocity: 0.65,
        pointers: 1
    },

    attrTest: function(input) {
        return input.velocity > this.options.velocity &&
            input.distance > this.options.distance &&
            input.eventType & INPUT_END;
    },

    emit: function(input) {
        this.manager.emit(this.options.event, input);
        this.manager.emit(this.options.event + input.direction, input);
    }
});

function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        movementBetween: 10, // a multi-tap can be a bit off the initial position
        movementWhile: 2 // a minimal movement is ok, but keep it low
    },

    test: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.movementWhile;
        var validTouchTime = input.deltaTime < options.time;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if(input.eventType & INPUT_END && validMovement && validTouchTime && validPointers) {
            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.movementBetween;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if(!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            var validTapCount = (this.count % options.taps === 0);
            if(validTapCount) {
                return STATE_RECOGNIZED;
            }
        }
        return STATE_FAILED;
    },

    emit: function(input) {
        input.tapCount = this.count;
        this.manager.emit(this.options.event, input);
    }
});

Hammer.INPUT_START = INPUT_START;
Hammer.INPUT_MOVE = INPUT_MOVE;
Hammer.INPUT_END = INPUT_END;
Hammer.INPUT_CANCEL = INPUT_CANCEL;

Hammer.STATE_POSSIBLE = STATE_POSSIBLE;
Hammer.STATE_BEGAN = STATE_BEGAN;
Hammer.STATE_CHANGED = STATE_CHANGED;
Hammer.STATE_ENDED = STATE_ENDED;
Hammer.STATE_RECOGNIZED = STATE_RECOGNIZED;
Hammer.STATE_CANCELLED = STATE_CANCELLED;
Hammer.STATE_FAILED = STATE_FAILED;

Hammer.DIRECTION_NONE = DIRECTION_NONE;
Hammer.DIRECTION_LEFT = DIRECTION_LEFT;
Hammer.DIRECTION_RIGHT = DIRECTION_RIGHT;
Hammer.DIRECTION_UP = DIRECTION_UP;
Hammer.DIRECTION_DOWN = DIRECTION_DOWN;
Hammer.DIRECTION_HORIZONTAL = DIRECTION_HORIZONTAL;
Hammer.DIRECTION_VERTICAL = DIRECTION_VERTICAL;
Hammer.DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

Hammer.EventEmitter = EventEmitter;
Hammer.Manager = Manager;
Hammer.Input = Input;
Hammer.TouchAction = TouchAction;

Hammer.Recognizer = Recognizer;
Hammer.AttrRecognizer = AttrRecognizer;
Hammer.Tap = TapRecognizer;
Hammer.Pan = PanRecognizer;
Hammer.Swipe = SwipeRecognizer;
Hammer.Pinch = PinchRecognizer;
Hammer.Rotate = RotateRecognizer;
Hammer.Press = PressRecognizer;

Hammer.on = addEventListeners;
Hammer.off = removeEventListeners;
Hammer.each = each;
Hammer.merge = merge;
Hammer.extend = extend;
Hammer.inherit = inherit;
Hammer.bindFn = bindFn;
Hammer.prefixed = prefixed;

if(typeof define == TYPE_FUNCTION && define.amd) {
    define(function() {
        return Hammer;
    });
} else if(typeof module != TYPE_UNDEFINED && module.exports) {
    module.exports = Hammer;
} else {
    window.Hammer = Hammer;
}

})(window);