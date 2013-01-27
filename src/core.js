var Hammer = function(element, options) {
    return new Hammer.Instance(element, options || {});
};

// default settings
Hammer.defaults = {
    stop_browser_behavior: true
    // more settings are defined at gestures.js
};

// detect touchevents
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

// direction defines
Hammer.DIRECTION_DOWN = 'down';
Hammer.DIRECTION_LEFT = 'left';
Hammer.DIRECTION_UP = 'up';
Hammer.DIRECTION_RIGHT = 'right';

// touch event defines
Hammer.TOUCH_START = 'start';
Hammer.TOUCH_MOVE = 'move';
Hammer.TOUCH_END = 'end';