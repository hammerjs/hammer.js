import Recognizer from '../recognizerjs/recognizer-constructor';
import {
    STATE_BEGAN,
    STATE_CHANGED,
    STATE_CANCELLED,
    STATE_ENDED,
    STATE_FAILED
} from '../recognizerjs/recognizer-consts';
import {
    INPUT_CANCEL,
    INPUT_END
} from '../inputjs/input-consts';

/**
 * @private
 * This recognizer is just used as a base for the simple attribute recognizers.
 * @constructor
 * @extends Recognizer
 */
export default class AttrRecognizer extends Recognizer {
  constructor() {
    super(...arguments);
  }

  /**
   * @private
   * Used to check if it the recognizer receives valid input, like input.distance > 10.
   * @memberof AttrRecognizer
   * @param {Object} input
   * @returns {Boolean} recognized
   */
  attrTest(input) {
    let optionPointers = this.options.pointers;
    return optionPointers === 0 || input.pointers.length === optionPointers;
  }

  /**
   * @private
   * Process the input and return the state for the recognizer
   * @memberof AttrRecognizer
   * @param {Object} input
   * @returns {*} State
   */
  process(input) {
    let { state } = this;
    let { eventType } = input;

    let isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
    let isValid = this.attrTest(input);

    // on cancel input and we've recognized before, return STATE_CANCELLED
    if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
      return state | STATE_CANCELLED;
    } else if (isRecognized || isValid) {
      if (eventType & INPUT_END) {
        return state | STATE_ENDED;
      } else if (!(state & STATE_BEGAN)) {
        return STATE_BEGAN;
      }
      return state | STATE_CHANGED;
    }
    return STATE_FAILED;
  }
}

AttrRecognizer.prototype.defaults = {
  /**
   * @private
   * @type {Number}
   * @default 1
   */
  pointers: 1
};
