import prefixed from '../utils/prefixed';
import {TEST_ELEMENT} from '../utils/utilsConsts';
import getTouchActionProps from './getTouchActionProps';

var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_MAP = getTouchActionProps();

export {PREFIXED_TOUCH_ACTION,NATIVE_TOUCH_ACTION,TOUCH_ACTION_AUTO,TOUCH_ACTION_COMPUTE,
  TOUCH_ACTION_MANIPULATION,TOUCH_ACTION_NONE,TOUCH_ACTION_PAN_X,TOUCH_ACTION_PAN_Y,
  TOUCH_ACTION_MAP};
