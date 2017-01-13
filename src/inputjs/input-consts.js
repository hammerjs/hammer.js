import prefixed from '../utils/prefixed';

const MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

const SUPPORT_TOUCH = ('ontouchstart' in window);
const SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
const SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

const INPUT_TYPE_TOUCH = 'touch';
const INPUT_TYPE_PEN = 'pen';
const INPUT_TYPE_MOUSE = 'mouse';
const INPUT_TYPE_KINECT = 'kinect';

const COMPUTE_INTERVAL = 25;

const INPUT_START = 1;
const INPUT_MOVE = 2;
const INPUT_END = 4;
const INPUT_CANCEL = 8;

const DIRECTION_NONE = 1;
const DIRECTION_LEFT = 2;
const DIRECTION_RIGHT = 4;
const DIRECTION_UP = 8;
const DIRECTION_DOWN = 16;

const DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
const DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
const DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

const PROPS_XY = ['x', 'y'];
const PROPS_CLIENT_XY = ['clientX', 'clientY'];

export {
    MOBILE_REGEX,
    SUPPORT_ONLY_TOUCH,
    SUPPORT_POINTER_EVENTS,
    SUPPORT_TOUCH,
    INPUT_TYPE_KINECT,
    INPUT_TYPE_MOUSE,
    INPUT_TYPE_PEN,
    INPUT_TYPE_TOUCH,
    COMPUTE_INTERVAL,
    INPUT_START,
    INPUT_MOVE,
    INPUT_END,
    INPUT_CANCEL,
    DIRECTION_NONE,
    DIRECTION_LEFT,
    DIRECTION_RIGHT,
    DIRECTION_UP,
    DIRECTION_DOWN,
    DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL,
    DIRECTION_ALL,
    PROPS_XY,
    PROPS_CLIENT_XY
};
