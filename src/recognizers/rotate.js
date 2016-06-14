import { AttrRecognizer } from './attribute';
import inherit from '../utils/inherit';
import { TOUCH_ACTION_NONE } from '../touchactionjs/touchaction-Consts';
import { STATE_BEGAN } from '../recognizerjs/recognizer-consts';

/**
 * @private
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
function RotateRecognizer() {
  AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
  /**
   * @private
   * @namespace
   * @memberof RotateRecognizer
   */
  defaults: {
    event: 'rotate',
    threshold: 0,
    pointers: 2
  },

  getTouchAction() {
    return [TOUCH_ACTION_NONE];
  },

  attrTest(input) {
    return this._super.attrTest.call(this, input) &&
        (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
  }
});

export {RotateRecognizer};
