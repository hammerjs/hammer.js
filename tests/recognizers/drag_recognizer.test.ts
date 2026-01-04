import {describe, it, expect, vi, beforeEach} from 'vitest';
import {DragRecognizer} from '../../src/recognizers/drag_recognizer';
import {MotionTracker} from '../../src/motion_tracker';

describe('DragRecognizer', () => {
  let tracker: MotionTracker;
  let callbacks: {onDragStart: () => void; onDrag: (data: {}) => void; onDragEnd: () => void};
  let recognizer: DragRecognizer;

  beforeEach(() => {
    tracker = new MotionTracker();
    callbacks = {onDragStart: vi.fn(), onDrag: vi.fn(), onDragEnd: vi.fn()};
    recognizer = new DragRecognizer(callbacks, {slop: 5});
  });

  it('does not drag if movement is within slop', () => {
    const e = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(e);
    recognizer.onStart(tracker, e);

    const eMove = {pointerId: 1, clientX: 2, clientY: 0} as PointerEvent;
    tracker.update(eMove);
    recognizer.onMove(tracker, eMove);

    expect(callbacks.onDragStart).not.toHaveBeenCalled();
  });

  it('starts drag when movement exceeds slop', () => {
    const e = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(e);
    recognizer.onStart(tracker, e);

    const eMove = {pointerId: 1, clientX: 10, clientY: 0} as PointerEvent;
    tracker.update(eMove);
    recognizer.onMove(tracker, eMove);

    expect(callbacks.onDragStart).toHaveBeenCalled();
    expect(callbacks.onDrag).toHaveBeenCalledWith(
      expect.objectContaining({
        deltaX: 10,
        deltaY: 0,
      })
    );
  });

  it('emits end event', () => {
    // Force drag start
    const e = {pointerId: 1, clientX: 0, clientY: 0} as PointerEvent;
    tracker.addPointer(e);
    recognizer.onStart(tracker, e);

    const eMove = {pointerId: 1, clientX: 10, clientY: 0} as PointerEvent;
    tracker.update(eMove);
    recognizer.onMove(tracker, eMove);

    recognizer.onEnd(tracker, eMove);
    expect(callbacks.onDragEnd).toHaveBeenCalled();
  });
});
