import { INPUT_START,INPUT_END } from './input-consts';

export default function computeDeltaXY(session, input) {
  let { center } = input;
  let offset = session.offsetDelta || {}; // could be further deconstructed later on
  let prevDelta = session.prevDelta || {};
  let prevInput = session.prevInput || {};

  if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
    prevDelta = session.prevDelta = {
      x: prevInput.deltaX || 0,
      y: prevInput.deltaY || 0
    };

    offset = session.offsetDelta = {
      x: center.x,
      y: center.y
    };
  }

  input.deltaX = prevDelta.x + (center.x - offset.x);
  input.deltaY = prevDelta.y + (center.y - offset.y);
}
