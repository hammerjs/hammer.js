import { INPUT_START,INPUT_END,INPUT_CANCEL } from './input-consts';
import computeInputData from './compute-input-data';

/**
 * @private
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
export default function inputHandler(manager, eventType, input) {
  let pointersLen = input.pointers.length;
  let changedPointersLen = input.changedPointers.length;
  let isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
  let isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

  input.isFirst = !!isFirst;
  input.isFinal = !!isFinal;

  if (isFirst) {
    manager.session = {};
  }

  // source event is the normalized value of the domEvents
  // like 'touchstart, mouseup, pointerdown'
  input.eventType = eventType;

  // compute scale, rotation etc
  computeInputData(manager, input);

  // emit secret event
  manager.emit('hammer.input', input);

  manager.recognize(input);
  manager.session.prevInput = input;
}
