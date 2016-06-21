import { AttrRecognizer } from './attribute';
import inherit from '../utils/inherit';
import { TOUCH_ACTION_NONE } from '../touchactionjs/touchaction-Consts';
import { STATE_BEGAN } from '../recognizerjs/recognizer-consts';

/**
 * @private
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */
function PinchRecognizer() {
  AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
  /**
   * @private
   * @namespace
   * @memberof PinchRecognizer
   */
  defaults: {
    event: 'pinch',
    threshold: 0,
    pointers: 2
  },

  getTouchAction() {
    return [TOUCH_ACTION_NONE];
  },

  attrTest(input) {
    return this._super.attrTest.call(this, input) &&
        (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
  },

  emit(input) {
    if (input.scale !== 1) {
      let inOut = input.scale < 1 ? 'in' : 'out';
      input.additionalEvent = this.options.event + inOut;
    }
    this._super.emit.call(this, input);
  }
});

export { PinchRecognizer };
