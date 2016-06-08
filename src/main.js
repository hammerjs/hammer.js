import {Hammer} from './hammer';
import {assign} from './utils/assign';
import {INPUT_START,INPUT_MOVE,INPUT_END,INPUT_CANCEL} from './inputjs/inputConsts';
import {STATE_POSSIBLE,STATE_BEGAN,STATE_CHANGED,STATE_ENDED,STATE_RECOGNIZED,
        STATE_CANCELLED,STATE_FAILED} from './recognizerjs/recognizerConsts';
import {DIRECTION_NONE,DIRECTION_LEFT,DIRECTION_RIGHT,DIRECTION_UP,DIRECTION_DOWN,
        DIRECTION_HORIZONTAL,DIRECTION_VERTICAL,DIRECTION_ALL} from './inputjs/inputConsts';

import {Manager} from './manager';
import {Input} from './inputjs/inputConstructor';
import {TouchAction} from './touchactionjs/touchActionConstructor';
import {TouchInput} from './input/touch';
import {MouseInput} from './input/mouse';
import {PointerEventInput} from './input/pointerevent';
import {SingleTouchInput} from './input/singletouch';
import {TouchMouseInput} from './input/touchmouse';

import {Recognizer} from  './recognizerjs/recognizerConstructor';
import {AttrRecognizer} from './recognizers/attribute';
import {TapRecognizer} from './recognizers/tap';
import {PanRecognizer} from './recognizers/pan';
import {SwipeRecognizer} from './recognizers/swipe';
import {PinchRecognizer} from './recognizers/pinch';
import {RotateRecognizer} from './recognizers/rotate';
import {PressRecognizer} from './recognizers/press';

import addEventListeners from './utils/addEventListeners';
import removeEventListeners from './utils/removeEventListeners';
import each from './utils/each';
import {merge} from './utils/merge';
import {extend} from './utils/extend';
import inherit from './utils/inherit';
import bindFn from './utils/bindFn';
import prefixed from './utils/prefixed';
import toArray from'./utils/toArray';
import uniqueArray from'./utils/uniqueArray';
import splitStr from'./utils/splitStr';
import inArray from'./utils/inArray';
import boolOrFn from'./utils/boolOrFn';
import hasParent from'./utils/hasParent';

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.

assign(Hammer, {
    INPUT_START: INPUT_START,
    INPUT_MOVE: INPUT_MOVE,
    INPUT_END: INPUT_END,
    INPUT_CANCEL: INPUT_CANCEL,

    STATE_POSSIBLE: STATE_POSSIBLE,
    STATE_BEGAN: STATE_BEGAN,
    STATE_CHANGED: STATE_CHANGED,
    STATE_ENDED: STATE_ENDED,
    STATE_RECOGNIZED: STATE_RECOGNIZED,
    STATE_CANCELLED: STATE_CANCELLED,
    STATE_FAILED: STATE_FAILED,

    DIRECTION_NONE: DIRECTION_NONE,
    DIRECTION_LEFT: DIRECTION_LEFT,
    DIRECTION_RIGHT: DIRECTION_RIGHT,
    DIRECTION_UP: DIRECTION_UP,
    DIRECTION_DOWN: DIRECTION_DOWN,
    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
    DIRECTION_ALL: DIRECTION_ALL,

    Manager: Manager,
    Input: Input,
    TouchAction: TouchAction,

    TouchInput: TouchInput,
    MouseInput: MouseInput,
    PointerEventInput: PointerEventInput,
    TouchMouseInput: TouchMouseInput,
    SingleTouchInput: SingleTouchInput,

    Recognizer: Recognizer,
    AttrRecognizer: AttrRecognizer,
    Tap: TapRecognizer,
    Pan: PanRecognizer,
    Swipe: SwipeRecognizer,
    Pinch: PinchRecognizer,
    Rotate: RotateRecognizer,
    Press: PressRecognizer,

    on: addEventListeners,
    off: removeEventListeners,
    each: each,
    merge: merge,
    extend: extend,
    assign: assign,
    inherit: inherit,
    bindFn: bindFn,
    prefixed: prefixed,
    toArray: toArray,
    inArray: inArray,
    uniqueArray: uniqueArray,
    splitStr: splitStr,
    boolOrFn:boolOrFn,
    hasParent:hasParent,
    addEventListeners: addEventListeners,
    removeEventListeners: removeEventListeners
});

var freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

if (typeof define === 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != 'undefined' && module.exports) {
    module.exports = Hammer;
} else {
    window[exportName] = Hammer;
}
