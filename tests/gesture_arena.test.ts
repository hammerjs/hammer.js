import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../src/gesture_arena';
import {GestureRecognizer, RecognizerState} from '../src/gesture_recognizer';
import {MotionAction, type MotionEvent, MotionEventStream} from '../src/motion_event';
import {FlingRecognizer} from '../src/recognizers/fling_recognizer';
import {LongPressRecognizer} from '../src/recognizers/long_press_recognizer';
import {PanRecognizer} from '../src/recognizers/pan_recognizer';
import {RotateRecognizer} from '../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../src/recognizers/scale_recognizer';
import {TapRecognizer} from '../src/recognizers/tap_recognizer';
import {pointerEvent} from './test_helpers';

describe('GestureArena conflict resolution', () => {
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

  it('prevents Tap and Pan when LongPress wins the arena, and never resurrects Scale on stray 2nd finger', () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const onLongPressCancel = vi.fn();
    const onPanStart = vi.fn();
    const onScale = vi.fn();

    arena.add(new TapRecognizer({onTap}, {maxTime: 1000}));
    arena.add(new LongPressRecognizer({onLongPress, onLongPressCancel}, {duration: 500}));
    arena.add(new PanRecognizer({onPanStart}));
    arena.add(new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      )!
    );

    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress.mock.calls[0][0]).toEqual(
      expect.objectContaining({center: {x: 50, y: 50}, deltaX: 0, deltaY: 0})
    );

    // Stray 2nd finger touches down at 600ms: cancels LongPress, and MUST NOT resurrect Scale!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 150, clientY: 50, timeStamp: 600})
      )!
    );
    expect(onLongPressCancel).toHaveBeenCalledTimes(1);

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 250, clientY: 50, timeStamp: 620})
      )!
    );
    expect(onScale).not.toHaveBeenCalled();
    expect(onPanStart).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it('supports causal dependency via singleTap.requireFailureOf(doubleTap) in any registration order', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();

    const singleTap = new TapRecognizer({onTap: onSingleTap}, {taps: 1});
    const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2, multiTapInterval: 300});
    singleTap.requireFailureOf(doubleTap);

    // Register singleTap BEFORE doubleTap:
    arena.add(singleTap);
    arena.add(doubleTap);

    // Scenario 1: Single tap waits 300ms for doubleTap to time out before firing.
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 50})
      )!
    );
    expect(onSingleTap).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();

    // Scenario 2: Double tap suppresses singleTap completely!
    onSingleTap.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 540})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 12, clientY: 12, timeStamp: 620})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 12, clientY: 12, timeStamp: 660})
      )!
    );

    vi.advanceTimersByTime(400);
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('recognizes Quick-Scale even when Tap and Pan are registered BEFORE Scale', () => {
    const onSingleTapConfirmed = vi.fn();
    const onDoubleTap = vi.fn();
    const onPan = vi.fn();
    const onScale = vi.fn();
    const onScaleEnd = vi.fn();

    const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2});
    const singleTap = new TapRecognizer({onTap: onSingleTapConfirmed}).requireFailureOf(doubleTap);

    // Register Tap, DoubleTap, AND Pan ahead of Scale({quickScale: true}):
    arena.add(singleTap);
    arena.add(doubleTap);
    arena.add(new PanRecognizer({onPan}, {slop: 8}));
    arena.add(
      new ScaleRecognizer(
        {onScale, onScaleEnd},
        {quickScale: true, quickScaleSensitivity: 100, spanSlop: 16}
      )
    );

    // Stroke 0: cancelled tap does NOT arm Quick-Scale:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 10})
      )!
    );

    // Stroke 1: clean single tap at (50, 100)
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 20})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 50})
      )!
    );

    // Stroke 2: touch down within 300ms and drag vertically in realistic small 60Hz steps!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 120})
      )!
    );
    for (const [y, t] of [
      [104, 136],
      [110, 152], // crosses touchSlop (8px) before spanSlop (16px)!
      [158, 168],
      [208, 184], // 100px past quickStartY (108) -> 2^1 = 2.0x scale!
    ]) {
      arena.dispatch(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: y, timeStamp: t})
        )!
      );
    }
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 208, timeStamp: 200})
      )!
    );
    vi.advanceTimersByTime(400);

    expect(onScale).toHaveBeenCalled();
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
    expect(onScale.mock.calls[onScale.mock.calls.length - 1][0].scale).toBeCloseTo(2.0, 3);
    expect(onPan).not.toHaveBeenCalled();
    expect(onSingleTapConfirmed).not.toHaveBeenCalled();
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('allows Scale and Rotate simultaneously while suppressing Fling after opposing pinch liftoff', () => {
    const onScale = vi.fn();
    const onRotate = vi.fn();
    const onFling = vi.fn();

    arena.add(new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10}));
    arena.add(new RotateRecognizer({onRotate}, {rotationSlop: 2, minSpan: 10}));
    arena.add(new FlingRecognizer({onFling}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: -50, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 0})
      )!
    );

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: -100, timeStamp: 16})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 16})
      )!
    );

    expect(onScale).toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: -100, timeStamp: 24})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 32})
      )!
    );

    expect(onFling).not.toHaveBeenCalled();
  });

  it('cancels active 1-finger Pan cleanly when a 2nd finger joins for Scale', () => {
    const onPanCancel = vi.fn();
    const onScale = vi.fn();
    const onRotate = vi.fn();
    const onTap = vi.fn();

    arena.add(new PanRecognizer({onPanCancel}, {numPointers: 1, slop: 5}));
    arena.add(new TapRecognizer({onTap}, {slop: 50}));
    arena.add(new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10}));
    arena.add(new RotateRecognizer({onRotate}, {rotationSlop: 2, minSpan: 10}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 16})
      )!
    );

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 120, clientY: 0, timeStamp: 24})
      )!
    );
    expect(onPanCancel).toHaveBeenCalledTimes(1);

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 20, clientY: 200, timeStamp: 40})
      )!
    );
    expect(onScale).toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it('handles recognizer removal, duplicate registration, competing pending claims, and defeated dependencies', () => {
    const onFirstPending = vi.fn();
    const onSecondPending = vi.fn();
    const blocker = new TapRecognizer({onTap: () => {}}, {taps: 2, multiTapInterval: 300});
    const pendingA = new TapRecognizer({onTap: onFirstPending}).requireFailureOf(blocker);
    const pendingB = new TapRecognizer({onTap: onSecondPending}).requireFailureOf(blocker);
    const unattachedDep = new TapRecognizer({onTap: () => {}});
    pendingA.requireFailureOf(unattachedDep, pendingA); // ignores unattached & self

    arena.add(blocker);
    arena.add(blocker); // duplicate add no-op
    arena.add(pendingA);
    arena.add(pendingB);
    expect(arena.getRecognizers()).toHaveLength(3);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 30})
      )!
    );
    expect(pendingA.state).toBe(RecognizerState.PENDING);
    expect(pendingB.state).toBe(RecognizerState.PENDING);

    // Removing `blocker` from the arena immediately resolves pending claims:
    // `pendingA` wins and mutually-incompatible `pendingB` is denied!
    arena.remove(unattachedDep); // no-op for unregistered
    arena.remove(blocker);
    expect(onFirstPending).toHaveBeenCalledTimes(1);
    expect(onSecondPending).not.toHaveBeenCalled();
    expect(pendingB.state).toBe(RecognizerState.FAILED);

    arena.reset();
    expect(pendingA.state).toBe(RecognizerState.POSSIBLE);
  });

  it('defeats late claims when a required-failure dependency or incompatible winner has already won', () => {
    class LateClaimRecognizer extends GestureRecognizer {
      readonly type = 'late';
      granted = false;
      onMotionEvent(event: MotionEvent): void {
        if (event.action === MotionAction.UP) {
          this.tryRecognizeDiscrete(() => {
            this.granted = true;
          });
        }
      }
    }

    const earlyWinner = new PanRecognizer({}, {slop: 4});
    const incompatibleDynamic = new LateClaimRecognizer();
    const defeatedDepDynamic = new LateClaimRecognizer();
    defeatedDepDynamic.simultaneousWith(earlyWinner, defeatedDepDynamic);
    defeatedDepDynamic.requireFailureOf(earlyWinner);

    arena.add(earlyWinner);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 25, clientY: 0, timeStamp: 16})
      )!
    );
    expect(earlyWinner.active).toBe(true);

    // Dynamically register both recognizers mid-stream AFTER `earlyWinner` has already won:
    arena.add(incompatibleDynamic);
    arena.add(defeatedDepDynamic);

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 25, clientY: 0, timeStamp: 32})
      )!
    );
    expect(incompatibleDynamic.granted).toBe(false);
    expect(incompatibleDynamic.state).toBe(RecognizerState.FAILED);
    expect(defeatedDepDynamic.granted).toBe(false);
    expect(defeatedDepDynamic.state).toBe(RecognizerState.FAILED);
  });

  it('supports standalone GestureRecognizer usage without GestureArena and validates base guards', () => {
    const onPan = vi.fn();
    const onFling = vi.fn();
    const onTap = vi.fn();
    const standalonePan = new PanRecognizer({onPan}, {numPointers: 0, slop: 2});
    const standaloneFling = new FlingRecognizer({onFling}, {minVelocity: 200, minDistance: 20});
    const standaloneTap = new TapRecognizer({onTap});

    const d1 = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
    )!;
    const m1 = stream.onPointerMove(
      pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 0, timeStamp: 10})
    )!;
    const up1 = stream.onPointerUp(
      pointerEvent('pointerup', {pointerId: 1, clientX: 100, clientY: 0, timeStamp: 20})
    )!;

    for (const ev of [d1, m1, up1]) {
      standalonePan.onMotionEvent(ev);
    }
    expect(onPan).toHaveBeenCalled();
    expect(onPan.mock.calls[0][0].velocityX).toBe(0); // No arena VelocityTracker attached

    // Standalone Fling without arena fails safely without throwing when `velocityTracker` is null:
    standaloneFling.onMotionEvent(d1);
    standaloneFling.onMotionEvent(m1);
    standaloneFling.onMotionEvent(up1);
    expect(onFling).not.toHaveBeenCalled();

    stream.reset();
    const td = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 5, clientY: 5, timeStamp: 0})
    )!;
    const tu = stream.onPointerUp(
      pointerEvent('pointerup', {pointerId: 1, clientX: 5, clientY: 5, timeStamp: 20})
    )!;
    standaloneTap.onMotionEvent(td);
    standaloneTap.onMotionEvent(tu);
    expect(onTap).toHaveBeenCalledTimes(1);

    // Custom subclass exercising base lifecycle defaults & guards:
    class GuardProbeRecognizer extends GestureRecognizer {
      readonly type = 'probe';
      exerciseGuards(): void {
        expect(this.getTouchAction()).toBe('none');
        expect(this.usesVelocity).toBe(true);
        expect(this.suppressesClick).toBe(true);
        this.emitChange(() => {});
        this.completeActive(() => {});
        this.fail();
        this.fail(); // idempotent
        expect(this.tryBegin(() => {})).toBe(false);
        expect(this.tryRecognizeDiscrete(() => {})).toBe(false);
        this.reset();
        this.cancel();
        this.cancel(); // idempotent
      }
      onMotionEvent(_event: MotionEvent): void {}
    }
    const probe = new GuardProbeRecognizer();
    probe.exerciseGuards();
  });

  it('supports simultaneous 2-finger Pan + Scale + Rotate composition', () => {
    const onPanStart = vi.fn();
    const onPan = vi.fn();
    const onPanEnd = vi.fn();
    const onScaleStart = vi.fn();
    const onScale = vi.fn();
    const onScaleEnd = vi.fn();
    const onRotateStart = vi.fn();
    const onRotate = vi.fn();
    const onRotateEnd = vi.fn();

    const pan = new PanRecognizer({onPanStart, onPan, onPanEnd}, {numPointers: 0, slop: 4});
    const scale = new ScaleRecognizer(
      {onScaleStart, onScale, onScaleEnd},
      {spanSlop: 4, minSpan: 10}
    );
    const rotate = new RotateRecognizer(
      {onRotateStart, onRotate, onRotateEnd},
      {rotationSlop: 2, minSpan: 10}
    );
    pan.simultaneousWith(scale, rotate);
    scale.simultaneousWith(pan);
    rotate.simultaneousWith(pan);

    arena.add(pan);
    arena.add(scale);
    arena.add(rotate);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 600})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 0, timeStamp: 600})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 100, timeStamp: 620})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 100, timeStamp: 640})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 650})
      )!
    );

    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(onScaleStart).toHaveBeenCalledTimes(1);
    expect(onScale).toHaveBeenCalled();
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
    expect(onRotateStart).toHaveBeenCalledTimes(1);
    expect(onRotate).toHaveBeenCalled();
    expect(onRotateEnd).toHaveBeenCalledTimes(1);
  });
});
