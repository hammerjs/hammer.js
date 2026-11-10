import {describe, it, expect, vi, beforeEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {FlingRecognizer} from '../../src/recognizers/fling_recognizer';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {pointerEvent} from '../test_helpers';

describe('FlingRecognizer', () => {
  let arena: GestureArena;
  let stream: MotionEventStream;

  beforeEach(() => {
    arena = new GestureArena();
    stream = new MotionEventStream();
  });

  it('detects a fast horizontal fling and reports velocity in px/s + cardinal direction', () => {
    const onFling = vi.fn();
    arena.add(new FlingRecognizer({onFling}, {minVelocity: 500, minDistance: 40}));

    // 40px every 10ms = 4000 px/s rightward
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
        pointerEvent('pointerup', {pointerId: 1, clientX: 120, clientY: 0, timeStamp: 30})
      )!
    );

    expect(onFling).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'right',
        axis: 'horizontal',
        deltaX: 120,
      })
    );
    expect(onFling.mock.calls[0][0].velocityX).toBeCloseTo(4000, 0);
  });

  it('does NOT misfire fling if user drags fast, pauses >40ms, and then lifts finger', () => {
    const onFling = vi.fn();
    arena.add(new FlingRecognizer({onFling}, {minVelocity: 300, minDistance: 30}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 16})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 200, clientY: 0, timeStamp: 32})
      )!
    );

    // Pause stationary for 100ms before lifting:
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 200, clientY: 0, timeStamp: 132})
      )!
    );

    expect(onFling).not.toHaveBeenCalled();
  });

  it('rejects short flicks below minDistance or directional mismatches', () => {
    const onFling = vi.fn();
    arena.add(
      new FlingRecognizer({onFling}, {minVelocity: 300, minDistance: 100, direction: 'left'})
    );

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 75, clientY: 0, timeStamp: 10})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 20})
      )!
    );
    expect(onFling).not.toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 80, clientY: 0, timeStamp: 115})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 160, clientY: 0, timeStamp: 130})
      )!
    );
    expect(onFling).not.toHaveBeenCalled();
  });

  it('supports vertical flings, axis filters, 2-pointer flings, simultaneous Pan cooperation, and cancel', () => {
    const onPan = vi.fn();
    const onVerticalFling = vi.fn();
    arena.add(new PanRecognizer({onPan}, {slop: 4}));
    arena.add(
      new FlingRecognizer(
        {onFling: onVerticalFling},
        {direction: 'vertical', minVelocity: 300, minDistance: 30}
      )
    );

    // Upward fling (`vy < 0`) alongside active Pan:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 100, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 50, timeStamp: 12})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 24})
      )!
    );
    expect(onPan).toHaveBeenCalled();
    expect(onVerticalFling).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'up', axis: 'vertical'})
    );

    // Downward 2-pointer fling (`numPointers: 2`, `vy > 0`):
    const onTwoFingerDownFling = vi.fn();
    const arena2 = new GestureArena();
    arena2.add(
      new FlingRecognizer(
        {onFling: onTwoFingerDownFling},
        {numPointers: 2, direction: 'down', minVelocity: 300, minDistance: 30}
      )
    );

    // Single-finger stroke fails `maxPointersSeen !== numPointers`:
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena2.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 100, timeStamp: 115})
      )!
    );
    expect(onTwoFingerDownFling).not.toHaveBeenCalled();

    // Parallel 2-finger downward flick succeeds:
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 200})
      )!
    );
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 200})
      )!
    );
    arena2.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 60, timeStamp: 212})
      )!
    );
    arena2.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 40, clientY: 60, timeStamp: 212})
      )!
    );
    arena2.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 40, clientY: 90, timeStamp: 220})
      )!
    );
    arena2.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 90, timeStamp: 224})
      )!
    );
    expect(onTwoFingerDownFling).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'down', axis: 'vertical'})
    );

    // Excess pointers (`POINTER_DOWN` and synthetic `DOWN`) & `CANCEL`:
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 300})
      )!
    );
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 302})
      )!
    );
    arena2.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 40, clientY: 0, timeStamp: 304})
      )!
    );
    arena2.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 310})
      )!
    );

    const oneFingerFling = new FlingRecognizer({onFling: vi.fn()}, {simultaneousWithPan: false});
    oneFingerFling.onMotionEvent(
      new MotionEvent({
        action: MotionAction.CANCEL,
        downTime: 0,
        eventTime: 5,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    oneFingerFling.reset();
    oneFingerFling.onMotionEvent(
      new MotionEvent({
        action: MotionAction.DOWN,
        downTime: 0,
        eventTime: 0,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0, pressure: 0.5},
          {pointerId: 2, x: 10, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
    arena2.destroy();
  });
});
