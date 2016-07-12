import { SUPPORT_POINTER_EVENTS,SUPPORT_ONLY_TOUCH,SUPPORT_TOUCH } from './input-consts';
import inputHandler from './input-handler';
import PointerEventInput from '../input/pointerevent';
import TouchInput from '../input/touch';
import MouseInput from '../input/mouse';
import TouchMouseInput from '../input/touchmouse';

/**
 * @private
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
export default function createInputInstance(manager) {
  let Type;
  // let inputClass = manager.options.inputClass;
  let { options:{ inputClass } } = manager;
  if (inputClass) {
    Type = inputClass;
  } else if (SUPPORT_POINTER_EVENTS) {
    Type = PointerEventInput;
  } else if (SUPPORT_ONLY_TOUCH) {
    Type = TouchInput;
  } else if (!SUPPORT_TOUCH) {
    Type = MouseInput;
  } else {
    Type = TouchMouseInput;
  }
  return new (Type)(manager, inputHandler);
}
