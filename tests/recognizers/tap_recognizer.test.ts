import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {TapRecognizer} from '../../src/recognizers/tap_recognizer';
import {MotionTracker} from '../../src/motion_tracker';

describe('TapRecognizer', () => {
  let tracker: MotionTracker;
  let callbacks: {onTap: (data: {}) => void};
  let recognizer: TapRecognizer;

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new MotionTracker();
    callbacks = {onTap: vi.fn()};
    recognizer = new TapRecognizer(callbacks);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects a valid tap', () => {
    const eStart = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    tracker.addPointer(eStart);
    recognizer.onStart(tracker, eStart);

    vi.advanceTimersByTime(100); // 100ms later

    const eEnd = {pointerId: 1, clientX: 2, clientY: 2, timeStamp: 100} as PointerEvent;
    // minimal movement
    tracker.update(eEnd);
    recognizer.onMove(tracker, eEnd);

    recognizer.onEnd(tracker, eEnd);

    expect(callbacks.onTap).toHaveBeenCalled();
  });

  it('fails if movement exceeds slop', () => {
    const eStart = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(eStart);
    recognizer.onStart(tracker, eStart);

    // Move 20px (default slop is 10px)
    const eMove = {pointerId: 1, clientX: 20, clientY: 0} as PointerEvent;
    tracker.update(eMove);
    recognizer.onMove(tracker, eMove);

    recognizer.onEnd(tracker, eMove);

    expect(callbacks.onTap).not.toHaveBeenCalled();
  });

  it('fails if time exceeds maxTime', () => {
    const eStart = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(eStart);
    recognizer.onStart(tracker, eStart);

    vi.advanceTimersByTime(300); // Default maxTime is 250ms

    recognizer.onEnd(tracker, eStart);

    expect(callbacks.onTap).not.toHaveBeenCalled();
  });
});
