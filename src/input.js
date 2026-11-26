var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

var SUPPORT_TOUCH = ('ontouchstart' in window);
var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && typeof navigator !== 'undefined' && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';
var INPUT_TYPE_KINECT = 'kinect';

var VELOCITY_HISTORY_CAPACITY = 32;
var VELOCITY_HORIZON_MS = 100;
var VELOCITY_ASSUME_STOPPED_MS = 40;
var VELOCITY_MIN_COALESCED_INTERVAL_MS = 4;

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
var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

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
    this.element = manager.element;
    this.target = manager.options.inputTarget;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
        if (manager.element && boolOrFn(manager.options.enable, [manager])) {
            self.handler(ev);
        }
    };

    this.init();

}

Input.prototype = {
    constructor: Input,

    /**
     * should handle the inputEvent data and trigger the callback
     * @virtual
     */
    handler: function() { },

    /**
     * bind the events
     */
    init: function() {
        this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    },

    /**
     * unbind the events
     */
    destroy: function() {
        this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    }
};

/**
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    var inputClass = manager.options.inputClass;

    if (inputClass) {
        Type = inputClass;
    } else if (SUPPORT_POINTER_EVENTS) {
        Type = PointerEventInput;
    } else if (SUPPORT_ONLY_TOUCH) {
        Type = TouchInput;
    } else if (!SUPPORT_TOUCH) {
        Type = MouseInput;
    } else {
        Type = TouchMouseInput;
    }
    return new (Type)(manager, inputHandler);
}

/**
 * check whether a pointerType is allowed by manager.options.pointerTypes
 * @param {Manager} manager
 * @param {String} pointerType
 * @returns {Boolean}
 */
function isAllowedPointerType(manager, pointerType) {
    var allowed = manager.options.pointerTypes;
    return !allowed || inArray(allowed, pointerType) > -1;
}

/**
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(manager, eventType, input) {
    if (!isAllowedPointerType(manager, input.pointerType)) {
        return;
    }
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;
    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

    input.isFirst = !!isFirst;
    input.isFinal = !!isFinal;

    if (isFirst) {
        var stopped = manager.session.stopped;
        each(manager.recognizers, function(recognizer) {
            if (stopped || (recognizer.state & (STATE_BEGAN | STATE_CHANGED))) {
                recognizer.reset();
                recognizer.state = STATE_POSSIBLE;
            }
        });
        manager.session = {};
    }

    // source event is the normalized value of the domEvents
    // like 'touchstart, mouseup, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(manager, input);

    // emit secret event
    manager.emit('hammer.input', input);

    manager.recognize(input);
    if (manager.element) {
        manager.session.prevInput = input;
    }
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
    if (!session.firstInput) {
        session.firstInput = simpleCloneInputData(input);
    }

    // to compute scale and rotation we need to store the multiple touches
    if (pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(input);
    } else if (pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;
    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

    var center = input.center = getCenter(pointers);
    input.timeStamp = now();
    input.deltaTime = input.timeStamp - firstInput.timeStamp;

    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);

    computeDeltaXY(session, input);
    input.offsetDirection = getDirection(input.deltaX, input.deltaY);

    var overallVelocityX = input.deltaX / input.deltaTime || 0;
    var overallVelocityY = input.deltaY / input.deltaTime || 0;
    input.overallVelocityX = overallVelocityX;
    input.overallVelocityY = overallVelocityY;
    input.overallVelocity = (abs(overallVelocityX) > abs(overallVelocityY)) ? overallVelocityX : overallVelocityY;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
        session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

    computeIntervalInputData(session, input);

    // find the correct target (use composedPath for Shadow DOM / window-bound listeners)
    var target = manager.element;
    var srcEvent = input.srcEvent;
    var srcEventTarget = (srcEvent.composedPath && srcEvent.composedPath()[0]) || srcEvent.target;
    if (hasParent(srcEventTarget, target)) {
        target = srcEventTarget;
    }
    input.target = target;
}

function computeDeltaXY(session, input) {
    var center = input.center;
    var offset = session.offsetDelta || {};
    var prevDelta = session.prevDelta || {};
    var prevInput = session.prevInput || {};

    if (!session.offsetDelta || input.eventType === INPUT_START || prevInput.eventType & (INPUT_END | INPUT_CANCEL)) {
        prevDelta = session.prevDelta = {
            x: prevInput.deltaX || 0,
            y: prevInput.deltaY || 0
        };

        offset = session.offsetDelta = {
            x: center.x,
            y: center.y
        };
    }

    input.deltaX = prevDelta.x + (center.x - offset.x);
    input.deltaY = prevDelta.y + (center.y - offset.y);
}

/**
 * track recent samples on the session and compute recency-weighted linear velocity (px/ms)
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    var samples = session.velocitySamples || (session.velocitySamples = []);
    var eventType = input.eventType;
    var srcEvent = input.srcEvent;
    var timeStamp = (srcEvent && srcEvent.timeStamp > 0) ? srcEvent.timeStamp : input.timeStamp;
    var x = input.deltaX;
    var y = input.deltaY;
    var lastSample, dt;

    if (eventType === INPUT_CANCEL) {
        samples.length = 0;
        input.velocity = 0;
        input.velocityX = 0;
        input.velocityY = 0;
        input.direction = (session.prevInput && session.prevInput.direction) || DIRECTION_NONE;
        return;
    }

    if (eventType === INPUT_END) {
        if (samples.length > 0) {
            lastSample = samples[samples.length - 1];
            dt = timeStamp - lastSample.t;
            if (dt > VELOCITY_ASSUME_STOPPED_MS || dt < 0) {
                samples.length = 0;
            } else if (samples.length < 2 && dt > 0 && (x !== lastSample.x || y !== lastSample.y)) {
                samples.push({t: timeStamp, x: x, y: y});
            }
        }
    } else {
        if (eventType === INPUT_MOVE && srcEvent && srcEvent.timeStamp > 0 &&
            typeof srcEvent.getCoalescedEvents === TYPE_FUNCTION) {
            var coalesced = srcEvent.getCoalescedEvents();
            if (coalesced && coalesced.length > 1 && srcEvent.clientX != null && srcEvent.clientY != null) {
                var invPointersLen = 1 / ((input.pointers && input.pointers.length) || 1);
                for (var cIdx = 0; cIdx < coalesced.length; cIdx++) {
                    var c = coalesced[cIdx];
                    var cTime = c.timeStamp;
                    if (cTime > 0 && cTime < timeStamp && (timeStamp - cTime) <= VELOCITY_HORIZON_MS &&
                        c.clientX != null && c.clientY != null) {
                        if (samples.length === 0 || (cTime - samples[samples.length - 1].t) >= VELOCITY_MIN_COALESCED_INTERVAL_MS) {
                            recordVelocitySample(
                                samples,
                                cTime,
                                x + (c.clientX - srcEvent.clientX) * invPointersLen,
                                y + (c.clientY - srcEvent.clientY) * invPointersLen
                            );
                        }
                    }
                }
            }
        }
        recordVelocitySample(samples, timeStamp, x, y);
    }

    computeWeightedVelocity(samples, input);
}

/**
 * append a velocity sample to the bounded session buffer with pause-reset and same-timestamp dedupe
 * @param {Array} samples
 * @param {Number} timeStamp
 * @param {Number} x
 * @param {Number} y
 */
function recordVelocitySample(samples, timeStamp, x, y) {
    if (samples.length > 0) {
        var lastSample = samples[samples.length - 1];
        var dt = timeStamp - lastSample.t;
        if (dt > VELOCITY_ASSUME_STOPPED_MS || dt < 0) {
            samples.length = 0;
        } else if (dt === 0) {
            lastSample.x = x;
            lastSample.y = y;
            return;
        }
    }

    samples.push({t: timeStamp, x: x, y: y});
    if (samples.length > VELOCITY_HISTORY_CAPACITY) {
        samples.shift();
    }
}

/**
 * compute recency-weighted 1st-order least-squares velocity (px/ms) over samples within VELOCITY_HORIZON_MS
 * @param {Array} samples
 * @param {Object} input
 */
function computeWeightedVelocity(samples, input) {
    var len = samples.length;
    var vx = 0;
    var vy = 0;

    if (len >= 2) {
        var newest = samples[len - 1];
        var newestTime = newest.t;
        var startIdx = len - 1;
        while (startIdx > 0 && (newestTime - samples[startIdx - 1].t) <= VELOCITY_HORIZON_MS) {
            startIdx--;
        }

        var oldest = samples[startIdx];
        var span = newestTime - oldest.t;
        if (span > 0) {
            var invSpan = 1 / span;
            vx = (newest.x - oldest.x) * invSpan;
            vy = (newest.y - oldest.y) * invSpan;

            if (len - startIdx > 2) {
                var sw = 1, st = 0, stt = 0;
                var sx = 0, stx = 0;
                var sy = 0, sty = 0;
                var i, s, tau, u, w, wt, dx, dy;

                for (i = startIdx; i < len - 1; i++) {
                    s = samples[i];
                    tau = (s.t - newestTime) * invSpan;
                    u = 1 + tau;
                    w = 0.1 + 0.9 * u * u;
                    wt = w * tau;
                    dx = s.x - newest.x;
                    dy = s.y - newest.y;

                    sw += w;
                    st += wt;
                    stt += wt * tau;
                    sx += w * dx;
                    stx += wt * dx;
                    sy += w * dy;
                    sty += wt * dy;
                }

                var denom = sw * stt - st * st;
                if (denom > 1e-12) {
                    denom = invSpan / denom;
                    vx = (sw * stx - st * sx) * denom;
                    vy = (sw * sty - st * sy) * denom;
                }
            }
        }
    }

    input.velocityX = vx;
    input.velocityY = vy;
    input.velocity = (abs(vx) > abs(vy)) ? vx : vy;
    input.direction = getDirection(vx, vy);
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
    var i = 0;
    while (i < input.pointers.length) {
        pointers[i] = {
            clientX: input.pointers[i].clientX,
            clientY: input.pointers[i].clientY
        };
        i++;
    }

    return {
        timeStamp: now(),
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
    if (pointersLength === 1) {
        return {
            x: pointers[0].clientX,
            y: pointers[0].clientY
        };
    }

    var x = 0, y = 0, i = 0;
    while (i < pointersLength) {
        x += pointers[i].clientX;
        y += pointers[i].clientY;
        i++;
    }

    return {
        x: x / pointersLength,
        y: y / pointersLength
    };
}

/**
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */
function getDirection(x, y) {
    if (x === 0 && y === 0) {
        return DIRECTION_NONE;
    }

    if (abs(x) >= abs(y)) {
        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
function getDistance(p1, p2, props) {
    if (!props) {
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
    if (!props) {
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
    var startDist = getDistance(start[0], start[1], PROPS_CLIENT_XY);
    return startDist ? getDistance(end[0], end[1], PROPS_CLIENT_XY) / startDist : 1;
}
