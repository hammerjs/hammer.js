import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {TapRecognizer} from '../../src/recognizers/tap_recognizer';
import {pointerEvent} from '../test_helpers';

describe('TapRecognizer', () => {
  let arena: GestureArena;
  let stream: MotionEventStream;

  beforeEach(() => {
    vi.useFakeTimers();
    arena = new GestureArena();
    stream = new MotionEventStream();
  });

  afterEach(() => {
    arena.destroy();
    vi.useRealTimers();
  });

  it('detects a valid single tap and emits center + tapCount', () => {
    const onTap = vi.fn();
    arena.add(new TapRecognizer({onTap}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 40, clientY: 60, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 42, clientY: 62, timeStamp: 50})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 42, clientY: 62, timeStamp: 80})
      )!
    );

    expect(onTap).toHaveBeenCalledWith(
      expect.objectContaining({
        center: {x: 42, y: 62},
        tapCount: 1,
      })
    );
  });

  it('fails if pointer exceeds radial slop or maxTime or is cancelled', () => {
    const onTap = vi.fn();
    arena.add(new TapRecognizer({onTap}, {slop: 10, maxTime: 250}));

    // Exceeds slop:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 40})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 60})
      )!
    );
    expect(onTap).not.toHaveBeenCalled();

    // Exceeds maxTime:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    vi.advanceTimersByTime(300);
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 400})
      )!
    );
    expect(onTap).not.toHaveBeenCalled();

    // Pointer cancel:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 520})
      )!
    );
    expect(onTap).not.toHaveBeenCalled();
  });

  it('composes onDown, tapTimeout onShowPress, immediate tap, confirmed single-tap, and double-tap via GestureArena', () => {
    const onDown = vi.fn();
    const onShowPress = vi.fn();
    const onSingleTapUp = vi.fn();
    const onSingleTapConfirmed = vi.fn();
    const onDoubleTap = vi.fn();

    const arenaWithTimeouts = new GestureArena({
      tapTimeout: 180,
      maxTapDuration: 300,
      doubleTapTimeout: 300,
      doubleTapMinTime: 40,
    });

    const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2});
    const singleTapConfirmed = new TapRecognizer({
      onTap: onSingleTapConfirmed,
    }).requireFailureOf(doubleTap);
    const singleTapUp = new TapRecognizer({
      onDown,
      onShowPress,
      onTap: onSingleTapUp,
    }).simultaneousWith(singleTapConfirmed, doubleTap);
    singleTapConfirmed.simultaneousWith(singleTapUp);
    doubleTap.simultaneousWith(singleTapUp);

    arenaWithTimeouts.add(singleTapUp);
    arenaWithTimeouts.add(singleTapConfirmed);
    arenaWithTimeouts.add(doubleTap);

    // 1. Hold past `tapTimeout` (180ms) -> fires `onDown` on DOWN, `onShowPress` at 180ms, `onSingleTapUp` on UP, and `onSingleTapConfirmed` after 300ms:
    arenaWithTimeouts.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      )!
    );
    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onShowPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(185);
    expect(onShowPress).toHaveBeenCalledTimes(1);

    arenaWithTimeouts.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 200})
      )!
    );
    expect(onSingleTapUp).toHaveBeenCalledTimes(1);
    expect(onSingleTapConfirmed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onSingleTapConfirmed).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();

    // 2. Touch bounce (< `doubleTapMinTime` = 40ms) is rejected, flushing Tap 1's `onSingleTapConfirmed`:
    onSingleTapConfirmed.mockClear();
    arenaWithTimeouts.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 600})
      )!
    );
    arenaWithTimeouts.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 630})
      )!
    );
    arenaWithTimeouts.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 645})
      )!
    );
    expect(onSingleTapConfirmed).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();
    arenaWithTimeouts.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 675})
      )!
    );
    vi.advanceTimersByTime(350);

    // 3. Valid rapid double tap (`dt = 80ms >= 40ms`) suppresses `onSingleTapConfirmed` and triggers `onDoubleTap`!
    onSingleTapConfirmed.mockClear();
    onShowPress.mockClear();
    arenaWithTimeouts.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 1100})
      )!
    );
    arenaWithTimeouts.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 1140})
      )!
    );
    arenaWithTimeouts.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 52, clientY: 52, timeStamp: 1220})
      )!
    );
    arenaWithTimeouts.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 52, clientY: 52, timeStamp: 1260})
      )!
    );

    vi.advanceTimersByTime(350);
    expect(onShowPress).not.toHaveBeenCalled(); // Quick taps (< 180ms) never flash `onShowPress`!
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    expect(onSingleTapConfirmed).not.toHaveBeenCalled();

    // 4. Explicit `minTapInterval` option overrides `doubleTapMinTime`:
    const customDouble = vi.fn();
    const fastArena = new GestureArena();
    fastArena.add(new TapRecognizer({onTap: customDouble}, {taps: 2, minTapInterval: 10}));
    fastArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 2000})
      )!
    );
    fastArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 2010})
      )!
    );
    fastArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 2025})
      )!
    );
    fastArena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 2035})
      )!
    );
    expect(customDouble).toHaveBeenCalledTimes(1);

    fastArena.destroy();
    arenaWithTimeouts.destroy();
  });

  it('supports multi-pointer taps (numPointers: 2)', () => {
    const onTap = vi.fn();
    arena.add(new TapRecognizer({onTap}, {numPointers: 2}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 10})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 50})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 40, clientY: 0, timeStamp: 60})
      )!
    );

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('rejects excess pointers, displaced liftoff, and distant follow-up taps', () => {
    const onSingleConfirmed = vi.fn();
    const onDouble = vi.fn();

    const doubleTap = new TapRecognizer({onTap: onDouble}, {taps: 2, multiTapSlop: 30});
    const singleTap = new TapRecognizer({onTap: onSingleConfirmed}, {slop: 8}).requireFailureOf(
      doubleTap
    );
    arena.add(singleTap);
    arena.add(doubleTap);

    // 1. Tap 1 at (0, 0), followed by Tap 2 far away at (200, 200) -> doubleTap fails in `prepareForDown`,
    //    immediately flushing Tap 1's pending `onSingleConfirmed`!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 30})
      )!
    );
    expect(onSingleConfirmed).not.toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 200, clientY: 200, timeStamp: 100})
      )!
    );
    expect(onSingleConfirmed).toHaveBeenCalledTimes(1);
    expect(onDouble).not.toHaveBeenCalled();

    // 2nd finger added during 1-finger tap fails immediately:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 210, clientY: 200, timeStamp: 110})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 210, clientY: 200, timeStamp: 120})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 200, clientY: 200, timeStamp: 130})
      )!
    );
    expect(onSingleConfirmed).toHaveBeenCalledTimes(1);

    // Displaced UP without intermediate MOVE (and multi-pointer POINTER_UP exceeding slop) fails:
    const twoFingerTap = new TapRecognizer({onTap: onDouble}, {numPointers: 2, slop: 5});
    arena.add(twoFingerTap);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 505})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 60, clientY: 0, timeStamp: 520})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 530})
      )!
    );
    expect(onDouble).not.toHaveBeenCalled();

    // Single-pointer UP jumping past slop without MOVE, and synthetic 2-pointer DOWN on 1-pointer Tap:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 1000})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 1020})
      )!
    );
    expect(onSingleConfirmed).toHaveBeenCalledTimes(1);

    arena.dispatch(
      new MotionEvent({
        action: MotionAction.DOWN,
        downTime: 1200,
        eventTime: 1200,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0, pressure: 0.5},
          {pointerId: 2, x: 10, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
  });
});
