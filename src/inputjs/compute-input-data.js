import { now } from '../utils/utils-consts';
import { abs } from '../utils/utils-consts';
import hasParent from '../utils/has-parent';
import simpleCloneInputData from './simple-clone-input-data';
import getCenter from './get-center';
import getDistance from './get-distance';
import getAngle from './get-angle';
import getDirection from './get-direction';
import computeDeltaXY from './compute-delta-xy';
import getVelocity from './get-velocity';
import getScale from './get-scale';
import getRotation from './get-rotation';
import computeIntervalInputData from './compute-interval-input-data';

/**
* @private
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */
export default function computeInputData(manager, input) {
  let { session } = manager;
  let { pointers } = input;
  let { length:pointersLength } = pointers;

  // store the first input to calculate the distance and direction
  if (!session.firstInput) {
    session.firstInput = simpleCloneInputData(input);
  }

  // to compute scale and rotation we need to store the multiple touches
  if (pointersLength > 1 && !session.firstMultiple) {
    session.firstMultiple = simpleCloneInputData(input);
  } else if (pointersLength === 1) {
    session.firstMultiple = false;
  }

  let { firstInput, firstMultiple } = session;
  let offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

  let center = input.center = getCenter(pointers);
  input.timeStamp = now();
  input.deltaTime = input.timeStamp - firstInput.timeStamp;

  input.angle = getAngle(offsetCenter, center);
  input.distance = getDistance(offsetCenter, center);

  computeDeltaXY(session, input);
  input.offsetDirection = getDirection(input.deltaX, input.deltaY);

  let overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
  input.overallVelocityX = overallVelocity.x;
  input.overallVelocityY = overallVelocity.y;
  input.overallVelocity = (abs(overallVelocity.x) > abs(overallVelocity.y)) ? overallVelocity.x : overallVelocity.y;

  input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
  input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

  input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
  session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

  computeIntervalInputData(session, input);

  // find the correct target
  let target = manager.element;
  if (hasParent(input.srcEvent.target, target)) {
    target = input.srcEvent.target;
  }
  input.target = target;
}
