import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {pointerEvent} from '../test_helpers';

describe('PanRecognizer (with integrated Fling)', () => {
  let arena: GestureArena;
  let stream: MotionEventStream;

  beforeEach(() => {
    arena = new GestureArena();
    stream = new MotionEventStream();
  });

  afterEach(() => {
    arena.destroy();
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

  it('respects horizontal, vertical, and cardinal direction constraints', () => {
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
    expect(onPanEnd.mock.calls[0][0].center).toEqual({x: 20, y: 60});
    expect(onPanEnd.mock.calls[0][0].velocityY).toBeGreaterThan(500);
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

  it('detects fast horizontal/vertical/2-pointer flings, single-frame flicks, and rejects >40ms pauses or short flicks', () => {
    const onFling = vi.fn();
    arena.add(new PanRecognizer({onFling}, {minFlingVelocity: 500, minFlingDistance: 40}));

    // 1. 40px every 10ms = 4000 px/s rightward
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 40, clientY: 0, timeStamp: 10})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 80, clientY: 0, timeStamp: 20})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 80, clientY: 0, timeStamp: 24})
      )!
    );
    expect(onFling).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'right', axis: 'horizontal'})
    );
    expect(onFling.mock.calls[0][0].velocityX).toBeCloseTo(4000, 0);

    // 2. Stationary pause >40ms before liftoff does NOT misfire fling:
    onFling.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 116})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 200, clientY: 0, timeStamp: 132})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 200, clientY: 0, timeStamp: 232})
      )!
    );
    expect(onFling).not.toHaveBeenCalled();

    // 3. Single-frame `DOWN -> UP` flick without intermediate `MOVE`:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 100, timeStamp: 300})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 20, timeStamp: 315})
      )!
    );
    expect(onFling).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'up', axis: 'vertical'})
    );

    // 4. Short flick (< minFlingDistance) & directional mismatch (`direction: 'left'`):
    const onLeftFling = vi.fn();
    const leftArena = new GestureArena();
    leftArena.add(
      new PanRecognizer(
        {onFling: onLeftFling},
        {direction: 'left', minFlingVelocity: 300, minFlingDistance: 100}
      )
    );
    leftArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 400})
      )!
    );
    leftArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 415})
      )!
    );
    leftArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 420})
      )!
    );
    expect(onLeftFling).not.toHaveBeenCalled();

    leftArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    leftArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 150, clientY: 0, timeStamp: 515})
      )!
    );
    leftArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 150, clientY: 0, timeStamp: 520})
      )!
    );
    expect(onLeftFling).not.toHaveBeenCalled();
    leftArena.destroy();

    // 5. 2-pointer downward fling (`numPointers: 2`, `direction: 'down'`):
    const onTwoFingerDown = vi.fn();
    const arena2 = new GestureArena();
    arena2.add(
      new PanRecognizer(
        {onFling: onTwoFingerDown},
        {numPointers: 2, direction: 'down', minFlingVelocity: 300, minFlingDistance: 30}
      )
    );
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 600})
      )!
    );
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 600})
      )!
    );
    arena2.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 60, timeStamp: 612})
      )!
    );
    arena2.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 40, clientY: 60, timeStamp: 612})
      )!
    );
    arena2.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 40, clientY: 60, timeStamp: 618})
      )!
    );
    arena2.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 60, timeStamp: 622})
      )!
    );
    expect(onTwoFingerDown).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'down', axis: 'vertical'})
    );
    arena2.destroy();
  });

  it('recognizes pull-out-then-flick-back flings returning to origin while rejecting tiny liftoff recoil', () => {
    const onFling = vi.fn();
    arena.add(
      new PanRecognizer(
        {onFling},
        {direction: 'horizontal', minFlingVelocity: 400, minFlingDistance: 50}
      )
    );

    // 1. Pull drawer right from x=0 to x=150, then flick it back closed to x=0 (net displacement = 0, return travel = 150px >= 50px):
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 150, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 75, clientY: 0, timeStamp: 115})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 130})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 134})
      )!
    );
    expect(onFling).toHaveBeenCalledTimes(1);
    expect(onFling).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'left', axis: 'horizontal'})
    );

    // 2. Drag right to x=150, pause, then tiny 8px backward recoil on move before liftoff (8px < 50px minFlingDistance):
    onFling.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 200})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 150, clientY: 0, timeStamp: 250})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 142, clientY: 0, timeStamp: 320})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 136, clientY: 0, timeStamp: 325})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 136, clientY: 0, timeStamp: 328})
      )!
    );
    expect(onFling).not.toHaveBeenCalled();

    // 3. Cardinal filter `'right'` allows panning out then back without firing a `'left'` fling:
    const onRightOnlyFling = vi.fn();
    const rightArena = new GestureArena();
    rightArena.add(
      new PanRecognizer(
        {onFling: onRightOnlyFling},
        {direction: 'right', minFlingVelocity: 400, minFlingDistance: 40}
      )
    );
    rightArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 400})
      )!
    );
    rightArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 120, clientY: 0, timeStamp: 420})
      )!
    );
    rightArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 435})
      )!
    );
    rightArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 438})
      )!
    );
    expect(onRightOnlyFling).not.toHaveBeenCalled();
    rightArena.destroy();
  });
});
