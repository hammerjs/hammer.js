/* global navigator, window */
import TouchInput from './../inputs/touch';
import MouseInput from './../inputs/mouse';
// import PointerInput from './inputs/pointer';

const MAY_SUPPORT_TOUCH = (('ontouchstart' in window) || // html5 browsers
  (navigator.maxTouchPoints > 0) ||   // future IE
  (navigator.msMaxTouchPoints > 0));  // current IE10

const MAY_SUPPORT_MOUSE = true;

// const SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;

function availableInputs() {
  let inputs = {};

  if (MAY_SUPPORT_MOUSE) {
    inputs.mouse = MouseInput;
  }

  if (MAY_SUPPORT_TOUCH) {
    inputs.touch = TouchInput;
  }

  return inputs;
}

export {
  availableInputs
};

export default availableInputs;
