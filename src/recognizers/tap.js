import setTimeoutContext from '../utils/set-timeout-context';
import Recognizer from '../recognizerjs/recognizer-constructor';
import { TOUCH_ACTION_MANIPULATION } from '../touchactionjs/touchaction-Consts';
import {INPUT_START,INPUT_END } from '../inputjs/input-consts';
import {
    STATE_RECOGNIZED,
    STATE_BEGAN,
    STATE_FAILED
} from '../recognizerjs/recognizer-consts';
import getDistance from '../inputjs/get-distance';

/**
 * @private
 * A tap is recognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
 * a single tap.
 *
 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
 * multi-taps being recognized.
 * @constructor
 * @extends Recognizer
 */
export default class TapRecognizer extends Recognizer {
  constructor() {
    super(...arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
  }

  getTouchAction() {
    return [TOUCH_ACTION_MANIPULATION];
  }

  process(input) {
    let { options } = this;

    let validPointers = input.pointers.length === options.pointers;
    let validMovement = input.distance < options.threshold;
    let validTouchTime = input.deltaTime < options.time;

    this.reset();

    if ((input.eventType & INPUT_START) && (this.count === 0)) {
      return this.failTimeout();
    }

    // we only allow little movement
    // and we've reached an end event, so a tap is possible
    if (validMovement && validTouchTime && validPointers) {
      if (input.eventType !== INPUT_END) {
        return this.failTimeout();
      }

      let validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
      let validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

      this.pTime = input.timeStamp;
      this.pCenter = input.center;

      if (!validMultiTap || !validInterval) {
        this.count = 1;
      } else {
        this.count += 1;
      }

      this._input = input;

      // if tap count matches we have recognized it,
      // else it has began recognizing...
      let tapCount = this.count % options.taps;
      if (tapCount === 0) {
        // no failing requirements, immediately trigger the tap event
        // or wait as long as the multitap interval to trigger
        if (!this.hasRequireFailures()) {
          return STATE_RECOGNIZED;
        } else {
          this._timer = setTimeoutContext(() => {
            this.state = STATE_RECOGNIZED;
            this.tryEmit();
          }, options.interval, this);
          return STATE_BEGAN;
        }
      }
    }
    return STATE_FAILED;
  }

  failTimeout() {
    this._timer = setTimeoutContext(() => {
      this.state = STATE_FAILED;
    }, this.options.interval, this);
    return STATE_FAILED;
  }

  reset() {
    clearTimeout(this._timer);
  }

  emit() {
    if (this.state === STATE_RECOGNIZED) {
      this._input.tapCount = this.count;
      this.manager.emit(this.options.event, this._input);
    }
  }
}

TapRecognizer.prototype.defaults = {
  event: 'tap',
  pointers: 1,
  taps: 1,
  interval: 300, // max time between the multi-tap taps
  time: 250, // max time of the pointer to be down (like finger on the screen)
  threshold: 9, // a minimal movement is ok, but keep it low
  posThreshold: 10 // a multi-tap can be a bit off the initial position
};
