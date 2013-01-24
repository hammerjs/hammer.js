function hammer(el, options) {
    return new HammerInstance(el, options || {});
}


// default settings
hammer.defaults = {
    // more settings are defined at gestures.js
};


// detect touchevents
hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);


// direction defines
hammer.DIRECTION_DOWN = 'down';
hammer.DIRECTION_LEFT = 'left';
hammer.DIRECTION_UP = 'up';
hammer.DIRECTION_RIGHT = 'right';


// touch event defines
hammer.TOUCH_START = 'start';
hammer.TOUCH_MOVE = 'move';
hammer.TOUCH_END = 'end';
