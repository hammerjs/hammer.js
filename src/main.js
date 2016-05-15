/**
 * Created by arjun on 1/5/16.
 */

import {assign,addEventListeners,removeEventListeners,each,merge,extend,inherit,bindFn,prefixed} from './utils'

import {Input,INPUT_START,INPUT_MOVE,INPUT_END,INPUT_CANCEL,DIRECTION_NONE,DIRECTION_LEFT,DIRECTION_RIGHT,
    DIRECTION_UP,DIRECTION_DOWN,DIRECTION_HORIZONTAL,DIRECTION_VERTICAL,DIRECTION_ALL} from './input'

import {MouseInput} from './input/mouse.js'
import {PointerEventInput} from './input/pointerevent'
import {SingleTouchInput} from './input/singletouch'
import {TouchInput} from './input/touch'
import {TouchMouseInput} from './input/touchmouse'

import {TouchAction} from './touchaction'


import {STATE_POSSIBLE,STATE_BEGAN,STATE_CHANGED,STATE_ENDED,STATE_RECOGNIZED,STATE_CANCELLED,STATE_FAILED,
    Recognizer} from './recognizer'

import {AttrRecognizer} from './recognizers/attribute'
import {TapRecognizer} from './recognizers/tap'
import {PanRecognizer} from './recognizers/pan'
import {SwipeRecognizer} from './recognizers/swipe'
import {PinchRecognizer} from './recognizers/pinch'
import {RotateRecognizer} from './recognizers/rotate'
import {PressRecognizer} from './recognizers/press'



import {Hammer} from './hammer'
import {Manager} from './manager'



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
    prefixed: prefixed
});

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.
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