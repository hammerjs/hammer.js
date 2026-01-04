import {describe, it, expect, vi, beforeEach} from 'vitest';
import {PinchRotateRecognizer} from '../../src/recognizers/pinch_rotate_recognizer';
import {MotionTracker} from '../../src/motion_tracker';

describe('PinchRotateRecognizer', () => {
  let tracker: MotionTracker;
  let callbacks: {onPinchRotate: (data: {}) => void};
  let recognizer: PinchRotateRecognizer;

  beforeEach(() => {
    tracker = new MotionTracker();
    callbacks = {onPinchRotate: vi.fn()};
    recognizer = new PinchRotateRecognizer(callbacks);
  });

  it('activates only with 2 pointers', () => {
    const p1 = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(p1);
    recognizer.onStart(tracker, p1);

    expect(recognizer.active).toBe(false);

    const p2 = {pointerId: 2, clientX: 10, clientY: 10} as PointerEvent;
    tracker.addPointer(p2);
    // Re-check start logic or move to activate
    recognizer.onMove(tracker, p2);

    expect(recognizer.active).toBe(true);
  });

  it('emits scale and rotation', () => {
    const p1 = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    const p2 = {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 0} as PointerEvent;
    tracker.addPointer(p1);
    tracker.addPointer(p2); // Distance 100

    // Zoom out (expand fingers)
    const p2Move = {pointerId: 2, clientX: 200, clientY: 0, timeStamp: 10} as PointerEvent;
    tracker.update(p2Move); // Distance 200, Scale should be 2.0

    recognizer.onMove(tracker, p2Move);

    expect(callbacks.onPinchRotate).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 2.0,
        rotation: 0,
      })
    );
  });
});
