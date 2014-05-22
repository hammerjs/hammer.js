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
    var event = inputData._event;

    if(!session.firstInput) {
        session.firstInput = {
            timeStamp: event.timeStamp,
            pointers: inputData.pointers,
            center: getCenter(inputData.pointers)
        };
    }

    inputData.inputEventType = inputEventType;

    inputData.center = getCenter(inputData.pointers);
    inputData.direction = getDirection(inputData.center, session.firstInput.center);
    inputData.distance = getDistance(inputData.center, session.firstInput.center);

    inputData.scale = 1;
    inputData.rotation = 0;
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
 * do a small comparision to get the direction between two center pointers
 * @method getDirection
 * @param {Object} center1
 * @param {Object} center2
 * @return {String} direction matches `DIRECTION_LEFT|RIGHT|UP|DOWN`
 */
function getDirection(center1, center2) {
    var x = center1.x - center2.x,
        y = center1.y - center2.y;

    if(x == y) {
        return DIRECTION_NONE;
    }

    if(Math.abs(x) >= Math.abs(y)) {
        return x > 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y > 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the distance between two center pointers
 * @method getDistance
 * @param {Object} center1
 * @param {Object} center2
 * @return {Number} distance
 */
function getDistance(center1, center2) {
    var x = center2.x - center1.x,
        y = center2.y - center1.y;
    return Math.sqrt((x * x) + (y * y));
}
