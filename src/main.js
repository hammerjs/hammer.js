import Hammer from './hammer';
import assign from './utils/assign';
import {
    INPUT_START,
    INPUT_MOVE,
    INPUT_END,
    INPUT_CANCEL
} from './inputjs/input-consts';
import {
    STATE_POSSIBLE,
    STATE_BEGAN,
    STATE_CHANGED,
    STATE_ENDED,
    STATE_RECOGNIZED,
    STATE_CANCELLED,
    STATE_FAILED
} from './recognizerjs/recognizer-consts';
import {
    DIRECTION_NONE,
    DIRECTION_LEFT,
    DIRECTION_RIGHT,
    DIRECTION_UP,
    DIRECTION_DOWN,
    DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL,
    DIRECTION_ALL
} from './inputjs/input-consts';

import Manager from './manager';
import Input from './inputjs/input-constructor';
import TouchAction from './touchactionjs/touchaction-constructor';
import TouchInput from './input/touch';
import MouseInput from './input/mouse';
import PointerEventInput from './input/pointerevent';
import SingleTouchInput from './input/singletouch';
import TouchMouseInput from './input/touchmouse';

import Recognizer from  './recognizerjs/recognizer-constructor';
import AttrRecognizer from './recognizers/attribute';
import TapRecognizer from './recognizers/tap';
import PanRecognizer from './recognizers/pan';
import SwipeRecognizer from './recognizers/swipe';
import PinchRecognizer from './recognizers/pinch';
import RotateRecognizer from './recognizers/rotate';
import PressRecognizer from './recognizers/press';

import addEventListeners from './utils/add-event-listeners';
import removeEventListeners from './utils/remove-event-listeners';
import each from './utils/each';
import merge from './utils/merge';
import extend from './utils/extend';
import inherit from './utils/inherit';
import bindFn from './utils/bind-fn';
import prefixed from './utils/prefixed';
import toArray from'./utils/to-array';
import uniqueArray from'./utils/unique-array';
import splitStr from'./utils/split-str';
import inArray from'./utils/in-array';
import boolOrFn from'./utils/bool-or-fn';
import hasParent from'./utils/has-parent';

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.

assign(Hammer, {
  INPUT_START,
  INPUT_MOVE,
  INPUT_END,
  INPUT_CANCEL,

  STATE_POSSIBLE,
  STATE_BEGAN,
  STATE_CHANGED,
  STATE_ENDED,
  STATE_RECOGNIZED,
  STATE_CANCELLED,
  STATE_FAILED,

  DIRECTION_NONE,
  DIRECTION_LEFT,
  DIRECTION_RIGHT,
  DIRECTION_UP,
  DIRECTION_DOWN,
  DIRECTION_HORIZONTAL,
  DIRECTION_VERTICAL,
  DIRECTION_ALL,

  Manager,
  Input,
  TouchAction,

  TouchInput,
  MouseInput,
  PointerEventInput,
  TouchMouseInput,
  SingleTouchInput,

  Recognizer,
  AttrRecognizer,
  Tap: TapRecognizer,
  Pan: PanRecognizer,
  Swipe: SwipeRecognizer,
  Pinch: PinchRecognizer,
  Rotate: RotateRecognizer,
  Press: PressRecognizer,

  on: addEventListeners,
  off: removeEventListeners,
  each,
  merge,
  extend,
  assign,
  inherit,
  bindFn,
  prefixed,
  toArray,
  inArray,
  uniqueArray,
  splitStr,
  boolOrFn,
  hasParent,
  addEventListeners,
  removeEventListeners
});

let freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

/* jshint ignore:start */
if (typeof define === 'function' && define.amd) {
  define(() => {
    return Hammer;
  });
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = Hammer;
} else {
  window[exportName] = Hammer;
}
/* jshint ignore:end */
