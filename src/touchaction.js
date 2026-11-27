var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_PINCH_ZOOM = 'pinch-zoom';
var VALID_TOUCH_ACTION_TOKENS = assign(Object.create(null), {
    auto: true,
    none: true,
    manipulation: true,
    'pan-x': true,
    'pan-left': true,
    'pan-right': true,
    'pan-y': true,
    'pan-up': true,
    'pan-down': true,
    'pinch-zoom': true
});
var TOUCH_ACTION_MAP = getTouchActionProps();

/**
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */
function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    constructor: TouchAction,

    /**
     * set the touchAction value on the element or enable the polyfill
     * @param {String} value
     */
    set: function(value) {
        if (typeof value !== 'string') {
            return;
        }
        value = value.toLowerCase().trim().replace(/\s+/g, ' ');

        // find out the touch-action by the event handlers
        if (value == TOUCH_ACTION_COMPUTE) {
            value = this.compute();
        }

        var element = this.manager.element;
        if (element && element.style && supportsTouchAction(value)) {
            if (!this.appliedNative || this.actions !== value) {
                if (this.oldTouchAction === undefined) {
                    this.oldTouchAction = element.style[PREFIXED_TOUCH_ACTION];
                }
                element.style[PREFIXED_TOUCH_ACTION] = value;
            }
            this.appliedNative = true;
        } else {
            if (this.appliedNative && isValidTouchActionValue(value) &&
                this.oldTouchAction !== undefined && element && element.style) {
                element.style[PREFIXED_TOUCH_ACTION] = this.oldTouchAction;
                this.oldTouchAction = undefined;
            }
            this.appliedNative = false;
        }
        this.actions = value;
    },

    /**
     * just re-set the touchAction value
     */
    update: function() {
        this.set(this.manager.options.touchAction);
    },

    /**
     * restore the original inline touch-action style on the element
     */
    destroy: function() {
        var element = this.manager.element;
        if (this.oldTouchAction !== undefined && element && element.style) {
            element.style[PREFIXED_TOUCH_ACTION] = this.oldTouchAction;
            this.oldTouchAction = undefined;
        }
    },

    /**
     * compute the value for the touchAction property based on the recognizer's settings
     * @returns {String} value
     */
    compute: function() {
        var actions = [];
        each(this.manager.recognizers, function(recognizer) {
            if (boolOrFn(recognizer.options.enable, [recognizer])) {
                var ta = recognizer.getTouchAction();
                if (ta && ta.length) {
                    actions.push.apply(actions, ta);
                }
            }
        });
        return cleanTouchActions(actions.join(' '));
    },

    /**
     * this method is called on each input cycle and provides the preventing of the browser behavior
     * @param {Object} input
     */
    preventDefaults: function(input) {
        var srcEvent = input.srcEvent;

        // if the touch action did prevented once this session
        if (this.manager.session.prevented) {
            if (srcEvent.cancelable !== false) {
                srcEvent.preventDefault();
            }
            return;
        }

        var actions = this.actions;
        if (this.appliedNative && supportsTouchAction(actions)) {
            return;
        }

        var direction = input.offsetDirection;
        var hasNone = hasTouchActionToken(actions, TOUCH_ACTION_NONE);
        var hasPanY = hasTouchActionToken(actions, TOUCH_ACTION_PAN_Y);
        var hasPanX = hasTouchActionToken(actions, TOUCH_ACTION_PAN_X);
        var hasPinchZoom = hasTouchActionToken(actions, TOUCH_ACTION_PINCH_ZOOM);

        var blocksSinglePointerPan = hasNone || (hasPinchZoom && !hasPanX && !hasPanY && input.pointers.length === 1);
        if (blocksSinglePointerPan) {
            // do not prevent defaults if this is a tap gesture
            var isTapPointer = input.pointers.length === 1;
            var isTapMovement = input.distance < 2;
            var isTapTouchTime = input.deltaTime < 250;

            if (isTapPointer && isTapMovement && isTapTouchTime) {
                return;
            }
        }

        if (hasPanX && hasPanY) {
            // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
            return;
        }

        if (blocksSinglePointerPan ||
            (hasPanY && direction & DIRECTION_HORIZONTAL) ||
            (hasPanX && direction & DIRECTION_VERTICAL)) {
            return this.preventSrc(srcEvent);
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    preventSrc: function(srcEvent) {
        if (srcEvent.cancelable !== false) {
            this.manager.session.prevented = true;
            srcEvent.preventDefault();
        }
    }
};

/**
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */
function hasTouchActionToken(actions, token) {
    return inStr(' ' + actions + ' ', ' ' + token + ' ');
}

function cleanTouchActions(actions) {
    var normalized = actions.replace(/\s+/g, ' ');

    // none
    if (hasTouchActionToken(normalized, TOUCH_ACTION_NONE)) {
        return TOUCH_ACTION_NONE;
    }

    var hasPanX = hasTouchActionToken(normalized, TOUCH_ACTION_PAN_X);
    var hasPanY = hasTouchActionToken(normalized, TOUCH_ACTION_PAN_Y);

    // if both pan-x and pan-y are set (different recognizers
    // for different directions, e.g. horizontal pan but vertical swipe?)
    // we need none (as otherwise with pan-x pan-y combined none of these
    // recognizers will work, since the browser would handle all panning
    if (hasPanX && hasPanY) {
        return TOUCH_ACTION_NONE;
    }

    // pan-x OR pan-y (preserve native pinch-zoom when supported and no multi-touch recognizer blocked it)
    if (hasPanX || hasPanY) {
        var panAction = hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
        var withPinchZoom = panAction + ' ' + TOUCH_ACTION_PINCH_ZOOM;
        return supportsTouchAction(withPinchZoom) ? withPinchZoom : panAction;
    }

    // pinch-zoom (more restrictive than manipulation: blocks panning while allowing pinch-zoom)
    if (hasTouchActionToken(normalized, TOUCH_ACTION_PINCH_ZOOM)) {
        return TOUCH_ACTION_PINCH_ZOOM;
    }

    // manipulation
    if (hasTouchActionToken(normalized, TOUCH_ACTION_MANIPULATION)) {
        return TOUCH_ACTION_MANIPULATION;
    }

    return TOUCH_ACTION_AUTO;
}

function isValidTouchActionValue(value) {
    if (typeof value !== 'string' || !value) {
        return false;
    }
    var tokens = splitStr(value);
    if (!tokens.length || tokens.length > 3) {
        return false;
    }
    for (var i = 0; i < tokens.length; i++) {
        if (!VALID_TOUCH_ACTION_TOKENS[tokens[i]]) {
            return false;
        }
    }
    return true;
}

function supportsTouchAction(value) {
    if (!TOUCH_ACTION_MAP || !isValidTouchActionValue(value)) {
        return false;
    }
    if (!hasOwn.call(TOUCH_ACTION_MAP, value)) {
        TOUCH_ACTION_MAP[value] = !!(window.CSS && typeof window.CSS.supports === TYPE_FUNCTION &&
            window.CSS.supports('touch-action', value));
    }
    return TOUCH_ACTION_MAP[value];
}

function getTouchActionProps() {
    if (!NATIVE_TOUCH_ACTION) {
        return false;
    }
    var touchMap = Object.create(null);
    var cssSupports = window.CSS && typeof window.CSS.supports === TYPE_FUNCTION;
    ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function(val) {

        // If css.supports is not supported but there is native touch-action assume it supports
        // all values. This is the case for IE 10 and 11.
        touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
    });
    return touchMap;
}
