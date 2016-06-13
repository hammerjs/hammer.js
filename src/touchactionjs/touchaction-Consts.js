import prefixed from '../utils/prefixed';
import { TEST_ELEMENT } from '../utils/utils-consts';
import getTouchActionProps from './get-touchaction-props';

const PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
const NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
const TOUCH_ACTION_COMPUTE = 'compute';
const TOUCH_ACTION_AUTO = 'auto';
const TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
const TOUCH_ACTION_NONE = 'none';
const TOUCH_ACTION_PAN_X = 'pan-x';
const TOUCH_ACTION_PAN_Y = 'pan-y';
const TOUCH_ACTION_MAP = getTouchActionProps();

export {
    PREFIXED_TOUCH_ACTION,
    NATIVE_TOUCH_ACTION,
    TOUCH_ACTION_AUTO,
    TOUCH_ACTION_COMPUTE,
    TOUCH_ACTION_MANIPULATION,
    TOUCH_ACTION_NONE,
    TOUCH_ACTION_PAN_X,
    TOUCH_ACTION_PAN_Y,
    TOUCH_ACTION_MAP
};
