import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {LongPressRecognizer} from '../../src/recognizers/long_press_recognizer';
import {MotionTracker} from '../../src/motion_tracker';

describe('LongPressRecognizer', () => {
  let tracker: MotionTracker;
  let callbacks: {onLongPress: (data: {}) => void};
  let recognizer: LongPressRecognizer;

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new MotionTracker();
    callbacks = {onLongPress: vi.fn()};
    recognizer = new LongPressRecognizer(callbacks, {duration: 500});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers after duration', () => {
    const e = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(e);
    recognizer.onStart(tracker, e);

    vi.advanceTimersByTime(501);

    expect(callbacks.onLongPress).toHaveBeenCalled();
  });

  it('cancels if pointer moves too far before duration', () => {
    const e = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(e);
    recognizer.onStart(tracker, e);

    vi.advanceTimersByTime(200);

    // Move beyond slop
    const eMove = {pointerId: 1, clientX: 50, clientY: 50} as PointerEvent;
    tracker.update(eMove);
    recognizer.onMove(tracker, eMove);

    vi.advanceTimersByTime(301); // Finish duration

    expect(callbacks.onLongPress).not.toHaveBeenCalled();
  });

  it('cancels if pointer released before duration', () => {
    const e = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(e);
    recognizer.onStart(tracker, e);

    vi.advanceTimersByTime(200);
    recognizer.onEnd(tracker, e);

    vi.advanceTimersByTime(500);

    expect(callbacks.onLongPress).not.toHaveBeenCalled();
  });
});
