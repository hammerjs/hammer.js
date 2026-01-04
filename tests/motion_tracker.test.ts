import {describe, it, expect, beforeEach} from 'vitest';
import {MotionTracker} from '../src/motion_tracker';

describe('MotionTracker', () => {
  let tracker: MotionTracker;

  beforeEach(() => {
    tracker = new MotionTracker();
  });

  it('calculates centroid for a single pointer', () => {
    const event = {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0} as PointerEvent;
    tracker.addPointer(event);

    expect(tracker.centroid).toEqual({x: 100, y: 100});
  });

  it('calculates centroid for multiple pointers', () => {
    const p1 = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    const p2 = {pointerId: 2, clientX: 100, clientY: 100, timeStamp: 0} as PointerEvent;

    tracker.addPointer(p1);
    tracker.addPointer(p2);

    expect(tracker.centroid).toEqual({x: 50, y: 50});
  });

  it('calculates velocity based on movement over time', () => {
    const p1 = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1000} as PointerEvent;
    tracker.addPointer(p1);

    const p2 = {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 1100} as PointerEvent; // moved 100px in 100ms
    tracker.update(p2);

    // Velocity = 100px / 100ms = 1px/ms
    // The tracker uses a low-pass filter: 0.8 * new + 0.2 * old
    // old is 0, new is 1. result should be 0.8.
    expect(tracker.velocityX).toBeCloseTo(0.8);
    expect(tracker.velocityY).toBeCloseTo(0);
  });

  it('calculates scale factor for pinch gesture', () => {
    const p1 = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    const p2 = {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 0} as PointerEvent;

    tracker.addPointer(p1);
    tracker.addPointer(p2); // Start dist = 10

    // Move p2 further away
    const p2Moved = {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 10} as PointerEvent;
    tracker.update(p2Moved); // New dist = 20

    expect(tracker.getScaleFactor()).toBeCloseTo(2.0);
  });

  it('calculates rotation delta', () => {
    const p1 = {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0} as PointerEvent;
    const p2 = {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 0} as PointerEvent; // 0 degrees

    tracker.addPointer(p1);
    tracker.addPointer(p2);

    // Rotate p2 90 degrees around p1 (0, 10)
    const p2Moved = {pointerId: 2, clientX: 0, clientY: 10, timeStamp: 10} as PointerEvent;
    tracker.update(p2Moved);

    expect(tracker.getRotationDelta()).toBeCloseTo(90);
  });
});
