var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;

var SUPPORT_POINTER_EVENTS = prefixed("PointerEvent", window);
var SUPPORT_TOUCH = ("ontouchstart" in window);
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = "touch";
var INPUT_TYPE_PEN = "pen";
var INPUT_TYPE_MOUSE = "mouse";

var SRC_EVENT_START = 1;
var SRC_EVENT_MOVE = 2;
var SRC_EVENT_END = 3;
var SRC_EVENT_CANCEL = 4;

var EVENT_START = 1;
var EVENT_TOUCH = 2;
var EVENT_MOVE = 3;
var EVENT_RELEASE = 4;
var EVENT_END = 5;
var EVENT_CANCEL = 6;

var DIRECTION_LEFT = "left";
var DIRECTION_RIGHT = "right";
var DIRECTION_UP = "up";
var DIRECTION_DOWN = "down";
var DIRECTION_NONE = "";

var PROPS_XY = ["x", "y"];
var PROPS_CLIENT_XY = ["clientX", "clientY"];

/**
 * create new input type instance
 * @param {Hammer} inst
 * @returns {Input}
 * @constructor
 */
function Input(inst) {
    var type = "TouchMouse";
    if(SUPPORT_POINTER_EVENTS) {
        type = "PointerEvent";
    } else if(SUPPORT_ONLY_TOUCH) {
        type = "Touch";
    } else if(!SUPPORT_TOUCH) {
        type = "Mouse";
    }
    return new Input[type](inst, inputHandler);
}

/**
 * handle input events
 * @param {Hammer} inst
 * @param {String} srcEventType
 * @param {Object} inputData
 */
function inputHandler(inst, srcEventType, inputData) {
    var session;

    if(srcEventType == SRC_EVENT_START) {
        // create session
        session = new Session(inst);
        inst.sessions.unshift(session);
    } else {
        // get latest session
        session = inst.sessions[0];
    }

    // source event is the normalized value of the events like 'touchstart, touchend, touchcancel, pointerdown'
    inputData.srcEventType = srcEventType;

    // compute scale, rotation etc
    computeInputData(session, inputData);

    // we want to trigger pretty events like 'start' at the beginning, 'end' as the last,
    // 'touch' on new touch, 'release' when a pointer goes up etc
    each(getEventTypes(srcEventType, inputData), function(eventType) {
        inputData.eventType = eventType;
        // update session and trigger the gestures
        session.update(inputData);
    });
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Session} session
 * @param {Object} inputData
 */
function computeInputData(session, inputData) {
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

    inputData.center = center;
    inputData.angle = getAngle(firstCenter, center);
    inputData.distance = getDistance(firstCenter, center);
    inputData.direction = getDirection(firstCenter, center);

    inputData.deltaTime = inputData.srcEvent.timeStamp - firstInput.timeStamp;
    inputData.deltaX = center.x - firstCenter.x;
    inputData.deltaY = center.y - firstCenter.y;

    inputData.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    inputData.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;
}

/**
 * create a simple clone from the inputData used for storage of firstInput and firstMultiple
 * @param {Object} inputData
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(inputData) {
    // make a simple copy of the pointers because we will get a reference if we don't
    // we only need clientXY for the calculations
    var pointers = [];
    each(inputData.pointers, function(pointer) {
        pointers.push({
            clientX: pointer.clientX,
            clientY: pointer.clientY
        });
    });

    return {
        timeStamp: inputData.srcEvent.timeStamp,
        pointers: pointers,
        center: getCenter(pointers)
    };
}

/**
 * get the event that is used by gestures
 * these are pretty events for more control.
 * it makes sure the start and end events are triggered only once, the touch/release on pointerdown/up etc.
 *
 * @param {String} srcEventType
 * @param {Object} inputData
 * @returns {Array} events
 */
function getEventTypes(srcEventType, inputData) {
    var pointersLength = inputData.pointers.length;
    var changedPointersLength = inputData.changedPointers.length;
    var diffPointers = pointersLength - changedPointersLength;

    // first touch
    if(pointersLength === 1 && srcEventType == SRC_EVENT_START) {
        return [EVENT_START, EVENT_TOUCH];
    }

    // new touch, but not the first
    if(pointersLength > 1 && srcEventType == SRC_EVENT_START) {
        return [EVENT_TOUCH];
    }

    // just a move event
    if(srcEventType == SRC_EVENT_MOVE) {
        return [EVENT_MOVE];
    }

    // and just a cancel event
    if(srcEventType == SRC_EVENT_CANCEL) {
        return [EVENT_CANCEL];
    }

    // end, but not the last one
    if(diffPointers >= 1 && srcEventType == SRC_EVENT_END) {
        return [EVENT_RELEASE];
    }

    // end and the last
    if(diffPointers === 0) {
        return [EVENT_RELEASE, EVENT_END];
    }

    return [];
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
