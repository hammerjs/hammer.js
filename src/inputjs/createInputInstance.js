/**
 * Created by arjun on 19/05/16.
 * Remember to import PointerEventInout
 */
import {SUPPORT_POINTER_EVENTS,SUPPORT_ONLY_TOUCH,SUPPORT_TOUCH} from './inputConsts'
import {inputHandler} from './inputHandler'
import {PointerEventInput} from '../input/pointerevent';
import {TouchInput} from '../input/touch';
import {MouseInput} from '../input/mouse';
import {TouchMouseInput} from '../input/touchmouse';
/**
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    var inputClass = manager.options.inputClass;

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

export {createInputInstance}