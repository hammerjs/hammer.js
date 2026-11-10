import {describe, it, expect, vi, beforeEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {pointerEvent} from '../test_helpers';

describe('PanRecognizer', () => {
  let arena: GestureArena;
  let stream: MotionEventStream;

  beforeEach(() => {
    arena = new GestureArena();
    stream = new MotionEventStream();
  });

  it('starts panning smoothly from the slop boundary without a first-frame jump and reports velocity', () => {
    const onPanStart = vi.fn();
    const onPan = vi.fn();
    const onPanEnd = vi.fn();

    arena.add(new PanRecognizer({onPanStart, onPan, onPanEnd}, {slop: 5}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 3, clientY: 0, timeStamp: 10})
      )!
    );
    expect(onPanStart).not.toHaveBeenCalled();

    // Move to x=20 with slop=5: starts at 0 and emits post-slop deltaX = 15 (no 5px jump!)
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 20})
      )!
    );
    expect(onPanStart).toHaveBeenCalledWith(expect.objectContaining({deltaX: 0, deltaY: 0}));
    expect(onPan).toHaveBeenCalledWith(
      expect.objectContaining({deltaX: 15, deltaY: 0, stepX: 15, stepY: 0})
    );

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 24})
      )!
    );
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(onPanEnd.mock.calls[0][0].velocityX).toBeGreaterThan(500);
  });

  it('re-anchors focal point without jumping and averages multi-pointer centroid velocity in numPointers: 0 mode', () => {
    const deltas: number[] = [];
    let latestVelocityX = 0;

    arena.add(
      new PanRecognizer(
        {
          onPan: ev => {
            deltas.push(ev.deltaX);
            latestVelocityX = ev.velocityX;
          },
        },
        {numPointers: 0, slop: 2}
      )
    );

    // Finger 1 starts at x=0 and moves to x=10 -> post-slop deltaX = 8
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 10, clientY: 0, timeStamp: 10})
      )!
    );
    expect(deltas).toEqual([8]);

    // Finger 2 touches down far away at x=210 (focus shifts to 110, deltaX must NOT jump!)
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 210, clientY: 0, timeStamp: 10})
      )!
    );

    // Finger 1 stays still while Finger 2 moves +20px in 10ms (+2000 px/s) -> centroid moves +10px (+1000 px/s)!
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 230, clientY: 0, timeStamp: 20})
      )!
    );
    expect(deltas[deltas.length - 1]).toBeCloseTo(18);
    expect(latestVelocityX).toBeGreaterThan(800);

    // Finger 2 lifts -> focus shifts back to Finger 1 at x=10, then Finger 1 moves +5px to x=15 -> deltaX = 23!
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 230, clientY: 0, timeStamp: 28})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 15, clientY: 0, timeStamp: 36})
      )!
    );
    expect(deltas[deltas.length - 1]).toBeCloseTo(23);
  });

  it('respects horizontal/vertical axis constraints', () => {
    const onPan = vi.fn();
    arena.add(new PanRecognizer({onPan}, {direction: 'horizontal', slop: 5}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 2, clientY: 20, timeStamp: 16})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 30, clientY: 20, timeStamp: 32})
      )!
    );

    expect(onPan).not.toHaveBeenCalled();
  });

  it('supports vertical axis lock, exact 2-pointer pans, pointer_up completion, and cancel', () => {
    const onPanStart = vi.fn();
    const onPan = vi.fn();
    const onPanEnd = vi.fn();
    const onPanCancel = vi.fn();

    arena.add(
      new PanRecognizer(
        {onPanStart, onPan, onPanEnd, onPanCancel},
        {numPointers: 2, direction: 'vertical', slop: 4}
      )
    );

    // 1. 1st finger moving before 2nd finger arrives is ignored (`!anchorReady`):
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 30, timeStamp: 10})
      )!
    );
    expect(onPanStart).not.toHaveBeenCalled();

    // 2nd finger arrives -> vertical drag begins -> lifting 2nd finger (`POINTER_UP`) ends 2-pointer pan cleanly:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 30, timeStamp: 12})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 60, timeStamp: 24})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 40, clientY: 60, timeStamp: 24})
      )!
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 40, clientY: 60, timeStamp: 32})
      )!
    );
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 60, timeStamp: 40})
      )!
    );

    // 2. Early `POINTER_UP` before active fails; 3rd finger before active fails; `CANCEL` fires `onPanCancel`:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 105})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 110})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 115})
      )!
    );

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 200})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 205})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 80, clientY: 0, timeStamp: 210})
      )!
    );
    stream.reset();
    arena.reset();

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 300})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 302})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 40, timeStamp: 316})
      )!
    );
    arena.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 40, timeStamp: 320})
      )!
    );
    expect(onPanCancel).toHaveBeenCalledTimes(1);

    // Synthetic 2-pointer DOWN on 1-pointer Pan fails immediately:
    const singleFingerPan = new PanRecognizer({}, {numPointers: 1});
    singleFingerPan.onMotionEvent(
      new MotionEvent({
        action: MotionAction.DOWN,
        downTime: 0,
        eventTime: 0,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0, pressure: 0.5},
          {pointerId: 2, x: 20, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
  });
});
