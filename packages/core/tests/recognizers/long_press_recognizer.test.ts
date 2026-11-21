import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionEvent} from '../../src/motion_event';
import {MotionEventStream} from '../../src/motion_event_stream';
import {LongPressRecognizer} from '../../src/recognizers/long_press_recognizer';
import {pointerEvent} from '../test_helpers';

describe('LongPressRecognizer', () => {
  let arena: GestureArena | undefined;
  let stream: MotionEventStream;

  beforeEach(() => {
    vi.useFakeTimers();
    arena = undefined;
    stream = new MotionEventStream();
  });

  afterEach(() => {
    arena?.destroy();
    vi.useRealTimers();
  });

  it('triggers after duration and supports post-trigger move and release', () => {
    const onLongPress = vi.fn();
    const onLongPressMove = vi.fn();
    const onLongPressUp = vi.fn();

    arena = new GestureArena([
      new LongPressRecognizer({onLongPress, onLongPressMove, onLongPressUp}, {duration: 500}),
    ]);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 20, timeStamp: 0})
      )!
    );

    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 40, clientY: 25, timeStamp: 520})
      )!
    );
    expect(onLongPressMove).toHaveBeenCalledWith(expect.objectContaining({deltaX: 30, deltaY: 5}));

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 40, clientY: 25, timeStamp: 540})
      )!
    );
    expect(onLongPressUp).toHaveBeenCalledTimes(1);
  });

  it('cancels if pointer moves beyond slop before duration', () => {
    const onLongPress = vi.fn();
    arena = new GestureArena([new LongPressRecognizer({onLongPress}, {duration: 500, slop: 8})]);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    vi.advanceTimersByTime(200);

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 200})
      )!
    );
    vi.advanceTimersByTime(400);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels if pointer is released before duration', () => {
    const onLongPress = vi.fn();
    arena = new GestureArena([new LongPressRecognizer({onLongPress}, {duration: 500})]);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    vi.advanceTimersByTime(200);
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 200})
      )!
    );
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('supports multi-pointer long press, pointer_up completion, excess pointer rejection, and cancel', () => {
    const onLongPress = vi.fn();
    const onLongPressUp = vi.fn();
    const onLongPressCancel = vi.fn();

    const lp = new LongPressRecognizer(
      {onLongPress, onLongPressUp, onLongPressCancel},
      {numPointers: 2, duration: 400, slop: 10}
    );
    arena = new GestureArena([lp]);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 20})
      )!
    );
    vi.advanceTimersByTime(400);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 5, clientY: 0, timeStamp: 430})
      )!
    );

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 450})
      )!
    );
    expect(onLongPressUp).toHaveBeenCalledTimes(1);
    expect(onLongPressUp).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: {x: 27.5, y: 0},
        deltaX: 2.5,
        deltaY: 0,
      })
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 5, clientY: 0, timeStamp: 460})
      )!
    );

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 510})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 550})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 560})
      )!
    );
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1100})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 1110})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 100, clientY: 0, timeStamp: 1120})
      )!
    );
    expect(lp.state).toBe('failed');
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    stream.reset();
    arena.reset();

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1500})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 1510})
      )!
    );
    vi.advanceTimersByTime(400);
    arena.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1950})
      )!
    );
    expect(onLongPressCancel).toHaveBeenCalledTimes(1);

    const oneFingerLp = new LongPressRecognizer({onLongPress: vi.fn()}, {numPointers: 1});
    oneFingerLp.onMotionEvent(
      new MotionEvent({
        action: 'down',
        eventTime: 0,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0},
          {pointerId: 2, x: 20, y: 0},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
    expect(oneFingerLp.state).toBe('failed');
  });
});
