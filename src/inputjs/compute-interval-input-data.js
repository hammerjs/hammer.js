import { INPUT_CANCEL,COMPUTE_INTERVAL } from './input-consts';
import { abs } from '../utils/utils-consts';
import getVelocity from './get-velocity';
import getDirection from './get-direction';

/**
 * @private
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
export default function computeIntervalInputData(session, input) {
  let last = session.lastInterval || input;
  let deltaTime = input.timeStamp - last.timeStamp;
  let velocity;
  let velocityX;
  let velocityY;
  let direction;

  if (input.eventType !== INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
    let deltaX = input.deltaX - last.deltaX;
    let deltaY = input.deltaY - last.deltaY;

    let v = getVelocity(deltaTime, deltaX, deltaY);
    velocityX = v.x;
    velocityY = v.y;
    velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
    direction = getDirection(deltaX, deltaY);

    session.lastInterval = input;
  } else {
    // use latest velocity info if it doesn't overtake a minimum period
    velocity = last.velocity;
    velocityX = last.velocityX;
    velocityY = last.velocityY;
    direction = last.direction;
  }

  input.velocity = velocity;
  input.velocityX = velocityX;
  input.velocityY = velocityY;
  input.direction = direction;
}
