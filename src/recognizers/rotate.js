import AttrRecognizer from './attribute';
import { TOUCH_ACTION_NONE } from '../touchactionjs/touchaction-Consts';
import { STATE_BEGAN } from '../recognizerjs/recognizer-consts';

/**
 * @private
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
export default class RotateRecognizer extends AttrRecognizer {
  constructor() {
    super(...arguments);
  }

  getTouchAction() {
    return [TOUCH_ACTION_NONE];
  }

  attrTest(input) {
    return super.attrTest(input) &&
        (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
  }
}

RotateRecognizer.prototype.defaults = {
  event: 'rotate',
  threshold: 0,
  pointers: 2
};
