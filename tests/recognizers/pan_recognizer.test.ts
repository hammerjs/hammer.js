import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {pointerEvent} from '../test_helpers';

describe('PanRecognizer (with integrated Swipe)', () => {
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

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 210, clientY: 0, timeStamp: 10})
      )!
    );

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 230, clientY: 0, timeStamp: 20})
      )!
    );
    expect(deltas[deltas.length - 1]).toBeCloseTo(18);
    expect(latestVelocityX).toBeGreaterThan(800);

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

  it('respects horizontal and vertical axis constraints', () => {
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

  it('detects fast horizontal, vertical, 2-pointer, and single-frame swipes while rejecting >40ms pauses or short flicks', () => {
    const onSwipe = vi.fn();
    arena.add(new PanRecognizer({onSwipe}, {minSwipeVelocity: 500, minSwipeDistance: 40}));

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
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'right', axis: 'horizontal'})
    );
    expect(onSwipe.mock.calls[0][0].velocityX).toBeCloseTo(4000, 0);

    onSwipe.mockClear();
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
    expect(onSwipe).not.toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 100, timeStamp: 300})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 60, timeStamp: 308})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 20, timeStamp: 316})
      )!
    );
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'up', axis: 'vertical'})
    );

    const onHorizSwipe = vi.fn();
    const horizArena = new GestureArena();
    horizArena.add(
      new PanRecognizer(
        {onSwipe: onHorizSwipe},
        {direction: 'horizontal', minSwipeVelocity: 300, minSwipeDistance: 100}
      )
    );
    horizArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 400})
      )!
    );
    horizArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 415})
      )!
    );
    horizArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 420})
      )!
    );
    expect(onHorizSwipe).not.toHaveBeenCalled();

    horizArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    horizArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 150, timeStamp: 515})
      )!
    );
    horizArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 150, timeStamp: 520})
      )!
    );
    expect(onHorizSwipe).not.toHaveBeenCalled();
    horizArena.destroy();

    const onTwoFingerDown = vi.fn();
    const arena2 = new GestureArena();
    arena2.add(
      new PanRecognizer(
        {onSwipe: onTwoFingerDown},
        {numPointers: 2, direction: 'vertical', minSwipeVelocity: 300, minSwipeDistance: 30}
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

  it('recognizes pull-out-then-flick-back swipes returning to origin while rejecting tiny liftoff recoil', () => {
    const onSwipe = vi.fn();
    arena.add(
      new PanRecognizer(
        {onSwipe},
        {direction: 'horizontal', minSwipeVelocity: 400, minSwipeDistance: 50}
      )
    );

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
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'left', axis: 'horizontal'})
    );

    onSwipe.mockClear();
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
    expect(onSwipe).not.toHaveBeenCalled();

    const onHorizOnlySwipe = vi.fn();
    const axisArena = new GestureArena();
    axisArena.add(
      new PanRecognizer(
        {onSwipe: onHorizOnlySwipe},
        {direction: 'horizontal', minSwipeVelocity: 400, minSwipeDistance: 40}
      )
    );
    axisArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 400})
      )!
    );
    axisArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 120, clientY: 0, timeStamp: 420})
      )!
    );
    axisArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 120, clientY: 100, timeStamp: 435})
      )!
    );
    axisArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 120, clientY: 100, timeStamp: 438})
      )!
    );
    expect(onHorizOnlySwipe).not.toHaveBeenCalled();
    axisArena.destroy();
  });

  it('keeps swipe travel extrema invariant across pointer additions and lifts in numPointers: 0 mode', () => {
    const onSwipe = vi.fn();
    arena.add(
      new PanRecognizer(
        {onSwipe},
        {numPointers: 0, slop: 4, minSwipeVelocity: 400, minSwipeDistance: 30}
      )
    );

    // 1. Stationary multi-touch re-anchor + tiny liftoff wobble (< 30px) must NOT fabricate a swipe:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 112, clientY: 100, timeStamp: 12})
      )!
    );
    // Finger #2 lands 200px away, shifting raw focusX by +100px without moving the user's hand:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 312, clientY: 100, timeStamp: 20})
      )!
    );
    // Finger #2 lifts after a pause (> 40ms), then finger #1 wobbles 6px left at fast speed:
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 312, clientY: 100, timeStamp: 70})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 106, clientY: 100, timeStamp: 75})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 106, clientY: 100, timeStamp: 78})
      )!
    );
    expect(onSwipe).not.toHaveBeenCalled();

    // 2. Real fast 2-finger swipe where the leading finger lifts first MUST still fire onSwipe:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 100, timeStamp: 200})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 100, timeStamp: 210})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 300, clientY: 100, timeStamp: 212})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: -60, clientY: 100, timeStamp: 224})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 220, clientY: 100, timeStamp: 224})
      )!
    );
    // Left finger lifts first (shifting raw focusX up to +220), then right finger lifts 2ms later:
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: -60, clientY: 100, timeStamp: 226})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 220, clientY: 100, timeStamp: 228})
      )!
    );
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'left', axis: 'horizontal'})
    );
  });
});
