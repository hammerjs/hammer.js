var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;

var SUPPORT_POINTEREVENT = window.PointerEvent || window.msPointerEvent;
var SUPPORT_TOUCH = ("ontouchstart" in window);
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_MOUSE = 'mouse';

var INPUT_EVENT_START = 'start';
var INPUT_EVENT_MOVE = 'move';
var INPUT_EVENT_END = 'end';

var DIRECTION_LEFT = 'left';
var DIRECTION_RIGHT = 'right';
var DIRECTION_UP = 'up';
var DIRECTION_DOWN = 'down';
var DIRECTION_NONE = 'none';

var PROPS_XY = ['x','y'];
var PROPS_CLIENTXY = ['clientX','clientY'];

/**
 * create new input type instance
 * @param inst
 * @returns {}
 * @constructor
 */
function Input(inst) {
    var type = 'TouchMouse';
    if(SUPPORT_POINTEREVENT) {
        type = 'PointerEvent';
    } else if(SUPPORT_ONLY_TOUCH) {
        type = 'Touch';
    } else if(!SUPPORT_TOUCH) {
        type = 'Mouse';
    }
    return new Input[type](inst, inputHandler);
}

/**
 * handle input events
 * @param inst
 * @param inputEventType
 * @param inputData
 */
function inputHandler(inst, inputEventType, inputData) {
    var session;

    if(inputEventType == INPUT_EVENT_START) {
        // create session
        session = new Session(inst);
        inst.sessions.unshift(session);
    } else {
        // get latest session
        session = inst.sessions[0];
    }

    computeInputData(session, inputEventType, inputData);

    // update the session and run gestures
    session.update(inputData);
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param session
 * @param inputEventType
 * @param inputData
 */
function computeInputData(session, inputEventType, inputData) {
    var pointers = inputData.pointers;
    var pointersLength = pointers.length;

    // store the first input to calculate the distance and direction
    if(!session.firstInput) {
        session.firstInput = simpleCloneInputData(inputData);
    }

    // to compute scale and rotation we need to store the multiple touches
    if(pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(inputData);
    } else if(pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;

    var center = getCenter(pointers);
    var firstCenter = firstInput.center;

    inputData.inputEventType = inputEventType;

    inputData.center = center;
    inputData.angle = getAngle(firstCenter, center);
    inputData.distance = getDistance(firstCenter, center);
    inputData.direction = getDirection(firstCenter, center);

    inputData.deltaTime = inputData._event.timeStamp - firstInput.timeStamp;
    inputData.deltaX = center.x - firstCenter.x;
    inputData.deltaY = center.y - firstCenter.y;

    inputData.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    inputData.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;
}

/**
 * create a simple clone from the inputData used for storage of firstInput and firstMultiple
 * @param inputData
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(inputData) {
    return {
        timeStamp: inputData._event.timeStamp,
        pointers: inputData.pointers,
        center: getCenter(inputData.pointers)
    };
}

/**
 * get the center of all the pointers
 * @method getCenter
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */
function getCenter(pointers) {
    // no need to loop when only one touch
    if(pointers.length === 1) {
        return {
            x: pointers[0].clientX,
            y: pointers[0].clientY
        };
    }

    var x = [],
        y = [];

    each(pointers, function(pointer) {
        x.push(pointer.clientX);
        y.push(pointer.clientY);
    });

    return {
        x: (Math.min.apply(Math, x) + Math.max.apply(Math, x)) / 2,
        y: (Math.min.apply(Math, y) + Math.max.apply(Math, y)) / 2
    };
}

/**
 * get the direction between two points
 * @method getDirection
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @return {String} direction matches `DIRECTION_LEFT|RIGHT|UP|DOWN`
 */
function getDirection(p1, p2) {
    var x = p1.x - p2.x,
        y = p1.y - p2.y;

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
 * @method getDistance
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
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
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @method getScale
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENTXY) / getDistance(start[0], start[1], PROPS_CLIENTXY);
}

/**
 * calculate the angle between two coordinates
 * @method getAngle
 * @param {Object} p1
 * @param {Object} p2
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
 * @method getRotation
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
function getRotation(start, end) {
    return getAngle(end[1], end[0], PROPS_CLIENTXY) - getAngle(start[1], start[0], PROPS_CLIENTXY);
}
