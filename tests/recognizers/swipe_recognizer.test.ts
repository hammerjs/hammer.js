import {describe, it, expect, vi, beforeEach} from 'vitest';
import {SwipeRecognizer} from '../../src/recognizers/swipe_recognizer';
import {MotionTracker} from '../../src/motion_tracker';

describe('SwipeRecognizer', () => {
  let tracker: MotionTracker;
  let callbacks: {onSwipe: (data: {}) => void};
  let recognizer: SwipeRecognizer;

  beforeEach(() => {
    tracker = new MotionTracker();
    callbacks = {onSwipe: vi.fn()};
    recognizer = new SwipeRecognizer(callbacks, {
      minVelocity: 0.5,
      minDist: 100,
    });
  });

  it('detects valid swipe', () => {
    const eStart = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    tracker.addPointer(eStart);
    recognizer.onStart(tracker, eStart);

    // Move 200px in 100ms (v = 2.0 px/ms)
    const eEnd = {pointerId: 1, clientX: 200, clientY: 0, timeStamp: 100} as PointerEvent;
    tracker.update(eEnd);

    recognizer.onEnd(tracker, eEnd);

    expect(callbacks.onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'horizontal',
        velocityX: expect.any(Number),
      })
    );
  });

  it('fails if distance is too short', () => {
    const eStart = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    tracker.addPointer(eStart);
    recognizer.onStart(tracker, eStart);

    // Fast but short
    const eEnd = {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 10} as PointerEvent;
    tracker.update(eEnd);

    recognizer.onEnd(tracker, eEnd);

    expect(callbacks.onSwipe).not.toHaveBeenCalled();
  });
});
