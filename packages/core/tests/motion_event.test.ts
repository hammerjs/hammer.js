import {describe, it, expect} from 'vitest';
import {centroid, distance, MotionEvent, ZERO_POINT} from '../src/motion_event';
import {pointerEvent} from './test_helpers';

describe('MotionEvent', () => {
  it('computes distance and centroid across 0, 1, and multiple points', () => {
    expect(distance({x: 0, y: 0}, {x: 3, y: 4})).toBe(5);
    expect(centroid([])).toBe(ZERO_POINT);
    expect(centroid([{x: 12, y: 34}])).toEqual({x: 12, y: 34});
    expect(
      centroid([
        {x: 0, y: 10},
        {x: 100, y: 30},
      ])
    ).toEqual({x: 50, y: 20});
  });

  it('computes focus, active pointers, findPointerIndex, and mean-deviation span', () => {
    const rawEv = pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0});

    const empty = new MotionEvent({
      action: 'down',
      eventTime: 0,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [],
      originalEvent: rawEv,
    });
    expect(empty.focus).toEqual({x: 0, y: 0});
    expect(empty.actionPointerId).toBe(-1);
    expect(empty.getSpan()).toBe(0);

    const single = new MotionEvent({
      action: 'down',
      eventTime: 5,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [{pointerId: 10, x: 15, y: 25}],
      originalEvent: rawEv,
    });
    expect(single.findPointerIndex(10)).toBe(0);
    expect(single.findPointerIndex(999)).toBe(-1);
    expect(single.getSpan()).toBe(0);

    const threePointers = new MotionEvent({
      action: 'pointer_down',
      eventTime: 10,
      actionIndex: 2,
      pointerType: 'touch',
      pointers: [
        {pointerId: 1, x: -60, y: 0},
        {pointerId: 2, x: 0, y: 0},
        {pointerId: 3, x: 60, y: 0},
      ],
      originalEvent: rawEv,
    });
    expect(threePointers.focus).toEqual({x: 0, y: 0});
    expect(threePointers.getSpan()).toBeCloseTo(80);
    expect(threePointers.getSpan()).toBeCloseTo(80);

    const pointerUp = new MotionEvent({
      action: 'pointer_up',
      eventTime: 20,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [
        {pointerId: 1, x: 100, y: 100},
        {pointerId: 2, x: 300, y: 100},
      ],
      originalEvent: rawEv,
    });
    expect(pointerUp.activePointerCount).toBe(1);
    expect(pointerUp.actionPointerId).toBe(1);
    expect(pointerUp.focus).toEqual({x: 300, y: 100});
    expect(pointerUp.getActivePointers()).toEqual([{pointerId: 2, x: 300, y: 100}]);

    const degeneratePointerUp = new MotionEvent({
      action: 'pointer_up',
      eventTime: 25,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [{pointerId: 1, x: 42, y: 84}],
      originalEvent: rawEv,
    });
    expect(degeneratePointerUp.focus).toEqual({x: 42, y: 84});

    const finalUp = new MotionEvent({
      action: 'up',
      eventTime: 30,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [{pointerId: 2, x: 300, y: 100}],
      originalEvent: rawEv,
    });
    expect(finalUp.activePointerCount).toBe(0);
    expect(finalUp.getActivePointers()).toEqual([]);
  });
});
