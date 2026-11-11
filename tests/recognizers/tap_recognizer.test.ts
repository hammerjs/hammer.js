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

  it('reports the multi-finger midpoint as center for 2-finger single and double taps', () => {
    const onTwoFingerSingle = vi.fn();
    const onTwoFingerDouble = vi.fn();
    const twoFingerDouble = new TapRecognizer(
      {onTap: onTwoFingerDouble},
      {numPointers: 2, taps: 2, multiTapSlop: 30}
    );
    const twoFingerSingle = new TapRecognizer(
      {onTap: onTwoFingerSingle},
      {numPointers: 2}
    ).requireFailureOf(twoFingerDouble);
    arena.add(twoFingerSingle);
    arena.add(twoFingerDouble);

    // 1. 2-finger single tap with fingers 200px apart at (0, 50) and (200, 50) -> center is (100, 50)!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 50, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 200, clientY: 50, timeStamp: 10})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 50, timeStamp: 40})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 200, clientY: 50, timeStamp: 45})
      )!
    );
    vi.advanceTimersByTime(350);
    expect(onTwoFingerSingle).toHaveBeenCalledTimes(1);
    expect(onTwoFingerSingle.mock.calls[0][0].center).toEqual({x: 100, y: 50});

    // 2. 2-finger double tap with fingers 200px apart (> multiTapSlop=30, but centroid shifts only 2px!):
    onTwoFingerSingle.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 50, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 200, clientY: 50, timeStamp: 505})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 50, timeStamp: 530})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 200, clientY: 50, timeStamp: 535})
      )!
    );

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 2, clientY: 50, timeStamp: 620})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 4, clientX: 202, clientY: 50, timeStamp: 625})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 4, clientX: 204, clientY: 50, timeStamp: 635})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 2, clientY: 50, timeStamp: 650})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 4, clientX: 204, clientY: 50, timeStamp: 655})
      )!
    );
    vi.advanceTimersByTime(350);

    expect(onTwoFingerDouble).toHaveBeenCalledTimes(1);
    expect(onTwoFingerDouble.mock.calls[0][0].center).toEqual({x: 103, y: 50});
    expect(onTwoFingerSingle).not.toHaveBeenCalled();

    // 3. Distant 2nd 2-finger tap (> multiTapSlop) rejects double-tap once 2nd finger lands:
    onTwoFingerDouble.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 5, clientX: 0, clientY: 50, timeStamp: 1100})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 6, clientX: 200, clientY: 50, timeStamp: 1105})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 5, clientX: 0, clientY: 50, timeStamp: 1130})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 6, clientX: 200, clientY: 50, timeStamp: 1135})
      )!
    );

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 7, clientX: 200, clientY: 300, timeStamp: 1200})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 8, clientX: 400, clientY: 300, timeStamp: 1205})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 7, clientX: 200, clientY: 300, timeStamp: 1230})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 8, clientX: 400, clientY: 300, timeStamp: 1235})
      )!
    );
    expect(onTwoFingerDouble).not.toHaveBeenCalled();
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

    // Hybrid modality mismatch (`mouse` Tap 1 -> `touch` Tap 2) and mid-stroke lift-and-repress both fail:
    onDouble.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 10,
          clientY: 10,
          timeStamp: 2000,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 10,
          clientY: 10,
          timeStamp: 2020,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 2,
          pointerType: 'touch',
          isPrimary: true,
          clientX: 10,
          clientY: 10,
          timeStamp: 2100,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {
          pointerId: 2,
          pointerType: 'touch',
          isPrimary: true,
          clientX: 10,
          clientY: 10,
          timeStamp: 2120,
        })
      )!
    );
    expect(onDouble).not.toHaveBeenCalled();

    // 2-finger tap where Finger 2 lifts and presses down AGAIN before Finger 1 lifts (`totalPointersInStroke === 3 !== 2`) fails:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 3000})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 2, clientY: 0, timeStamp: 3005})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 2, clientY: 0, timeStamp: 3015})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 2, clientY: 0, timeStamp: 3025})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 2, clientY: 0, timeStamp: 3035})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 3040})
      )!
    );
    expect(onDouble).not.toHaveBeenCalled();
  });

  it('requires all numPointers fingers to be down simultaneously for a multi-finger tap', () => {
    const onTap = vi.fn();
    arena.add(new TapRecognizer({onTap}, {numPointers: 3}));
    const down = (id: number, t: number) =>
      arena.dispatch(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: id, clientX: id * 20, timeStamp: t})
        )!
      );
    const up = (id: number, t: number) =>
      arena.dispatch(
        stream.onPointerUp(
          pointerEvent('pointerup', {pointerId: id, clientX: id * 20, timeStamp: t})
        )!
      );

    // Three fingers touch in total, but never more than two at once:
    down(1, 0);
    down(2, 10);
    up(2, 20);
    down(3, 30);
    up(3, 40);
    up(1, 50);
    expect(onTap).not.toHaveBeenCalled();

    // A genuine 3-finger tap:
    down(1, 400);
    down(2, 405);
    down(3, 410);
    up(3, 450);
    up(2, 455);
    up(1, 460);
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
