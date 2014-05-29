var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;

var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent');
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

var DIRECTION_LEFT = 'left';
var DIRECTION_RIGHT = 'right';
var DIRECTION_UP = 'up';
var DIRECTION_DOWN = 'down';
var DIRECTION_NONE = '';

var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * create new input type instance
 * @param {Instance} inst
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
function Input(inst, callback) {
    this.inst = inst;
    this.callback = callback;

    // used for internal events
    this._handler = bindFn(this.handler, this);

    this._elEvents && addEvent(this.inst.element, this._elEvents, this._handler);
    this._winEvents && addEvent(window, this._winEvents, this._handler);
}

Input.prototype = {
    destroy: function() {
        this._elEvents && removeEvent(this.inst.element, this._elEvents, this._handler);
        this._winEvents && removeEvent(window, this._winEvents, this._handler);
    }
};

/**
 * create new input type instance
 * @param {Hammer} inst
 * @returns {Input}
 */
function createInputInstance(inst) {
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
    return new (Type)(inst, inputHandler);
}

/**
 * handle input events
 * @param {Instance} inst
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(inst, eventType, input) {
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;

    var isFirst = (eventType === INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType === INPUT_END && (pointersLen - changedPointersLen === 0));

    input.isFirst = isFirst;
    input.isFinal = isFinal;

    if(eventType === INPUT_START && input.isFirst) {
        inst.session = {};
    }
    // source event is the normalized value of the events like 'touchstart, touchend, touchcancel, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(inst.session, input);

    inst.update(input);
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} session
 * @param {Object} input
 */
function computeInputData(session, input) {
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

    input.timeStamp = input.srcEvent.timeStamp;

    input.center = center;
    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);
    input.direction = getDirection(offsetCenter, center);

    input.deltaTime = input.timeStamp - firstInput.timeStamp;
    input.deltaX = center.x - offsetCenter.x;
    input.deltaY = center.y - offsetCenter.y;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    computeIntervalInputData(session, input);
}

/**
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    if(!session.lastInterval) {
        session.lastInterval = simpleCloneInputData(input);
    }

    var deltaTime = input.timeStamp - session.lastInterval.timeStamp;

    if(deltaTime > COMPUTE_INTERVAL || !session.lastInterval.velocity) {
        var deltaX = input.deltaX - session.lastInterval.deltaX;
        var deltaY = input.deltaY - session.lastInterval.deltaY;

        session.lastInterval = simpleCloneInputData(input);
        session.lastInterval.velocity = getVelocity(deltaTime, deltaX, deltaY);
    }

    var velocity = session.lastInterval.velocity;

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
    each(input.pointers, function(pointer) {
        pointers.push({
            clientX: round(pointer.clientX),
            clientY: round(pointer.clientY)
        });
    });

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
    // no need to loop when only one touch
    if(pointers.length === 1) {
        return {
            x: round(pointers[0].clientX),
            y: round(pointers[0].clientY)
        };
    }

    var x = [],
        y = [];

    each(pointers, function(pointer) {
        x.push(pointer.clientX);
        y.push(pointer.clientY);
    });

    return {
        x: round((Math.min.apply(Math, x) + Math.max.apply(Math, x)) / 2),
        y: round((Math.min.apply(Math, y) + Math.max.apply(Math, y)) / 2)
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
 * @return {String} direction matches `DIRECTION_NONE|LEFT|RIGHT|UP|DOWN`
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
