import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../src/gesture_arena';
import {GestureRecognizer, RecognizerState} from '../src/gesture_recognizer';
import {MotionAction, type MotionEvent, MotionEventStream} from '../src/motion_event';
import {LongPressRecognizer} from '../src/recognizers/long_press_recognizer';
import {PanRecognizer} from '../src/recognizers/pan_recognizer';
import {QuickScaleRecognizer} from '../src/recognizers/quick_scale_recognizer';
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

  it('prevents Tap and Pan when LongPress wins the arena, and does not activate Scale on a late 2nd finger', () => {
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

  it('supports causal dependency via singleTap.requireFailureOf(doubleTap) regardless of registration order', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();

    const singleTap = new TapRecognizer({onTap: onSingleTap}, {taps: 1});
    const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2, multiTapInterval: 300});
    singleTap.requireFailureOf(doubleTap);

    arena.add(singleTap);
    arena.add(doubleTap);

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

  it('recognizes QuickScaleRecognizer even when Tap and Pan are registered first', () => {
    const onSingleTapConfirmed = vi.fn();
    const onDoubleTap = vi.fn();
    const onPan = vi.fn();
    const onScale = vi.fn();
    const onScaleEnd = vi.fn();

    const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2});
    const singleTap = new TapRecognizer({onTap: onSingleTapConfirmed}).requireFailureOf(doubleTap);

    arena.add(singleTap);
    arena.add(doubleTap);
    arena.add(new PanRecognizer({onPan}, {slop: 8}));
    arena.add(new QuickScaleRecognizer({onScale, onScaleEnd}, {sensitivity: 100, slop: 8}));

    // Cancelled tap should not arm QuickScale.
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

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 120})
      )!
    );
    for (const [y, t] of [
      [104, 136],
      [110, 152],
      [158, 168],
      [208, 184], // 100px past startY (108) -> 2.0x scale
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

  it('allows Scale and Rotate simultaneously while suppressing Pan onSwipe after opposing pinch liftoff', () => {
    const onScale = vi.fn();
    const onRotate = vi.fn();
    const onSwipe = vi.fn();

    const scale = new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10});
    const rotate = new RotateRecognizer({onRotate}, {rotationSlop: 2, minSpan: 10});
    const pan = new PanRecognizer({onSwipe}, {numPointers: 0, slop: 2}).simultaneousWith(
      scale,
      rotate
    );
    scale.simultaneousWith(rotate);

    arena.add(scale);
    arena.add(rotate);
    arena.add(pan);

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

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('cancels active 1-finger Pan cleanly when a 2nd finger joins for Scale, Rotate, or 2-finger Pan', () => {
    const onPanCancel = vi.fn();
    const onTwoFingerPan = vi.fn();
    const onScale = vi.fn();
    const onRotate = vi.fn();
    const onTap = vi.fn();

    const scale = new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10});
    const rotate = new RotateRecognizer({onRotate}, {rotationSlop: 2, minSpan: 10});
    const twoFingerPan = new PanRecognizer(
      {onPan: onTwoFingerPan},
      {numPointers: 2, slop: 4}
    ).simultaneousWith(scale, rotate);
    scale.simultaneousWith(rotate);

    arena.add(new PanRecognizer({onPanCancel}, {numPointers: 1, slop: 5}));
    arena.add(new TapRecognizer({onTap}, {slop: 50}));
    arena.add(scale);
    arena.add(rotate);
    arena.add(twoFingerPan);

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
    expect(onTwoFingerPan).toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it('cancels orphaned active winners and resets stale timers when ghost-pointer recovery dispatches a fresh DOWN', () => {
    const onPanStart = vi.fn();
    const onPanCancel = vi.fn();
    const onLongPress = vi.fn();

    arena.add(new PanRecognizer({onPanStart, onPanCancel}, {slop: 4}));
    arena.add(new LongPressRecognizer({onLongPress}, {duration: 500, slop: 100}));

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
          clientX: 0,
          clientY: 0,
          timeStamp: 0,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 16})
      )!
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);

    // Next primary touch arrives without a preceding pointerup, recovering as a fresh DOWN.
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 2,
          pointerType: 'touch',
          isPrimary: true,
          clientX: 50,
          clientY: 50,
          timeStamp: 300,
        })
      )!
    );
    expect(onPanCancel).toHaveBeenCalledTimes(1);

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 80, clientY: 50, timeStamp: 316})
      )!
    );
    expect(onPanStart).toHaveBeenCalledTimes(2);
  });

  it('handles recognizer removal, duplicate registration, competing pending claims, and defeated dependencies', () => {
    const onFirstPending = vi.fn();
    const onSecondPending = vi.fn();
    const blocker = new TapRecognizer({onTap: () => {}}, {taps: 2, multiTapInterval: 300});
    const pendingA = new TapRecognizer({onTap: onFirstPending}).requireFailureOf(blocker);
    const pendingB = new TapRecognizer({onTap: onSecondPending}).requireFailureOf(blocker);
    const unattachedDep = new TapRecognizer({onTap: () => {}});
    pendingA.requireFailureOf(unattachedDep, pendingA);

    arena.add(blocker);
    arena.add(blocker);
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

    arena.remove(unattachedDep);
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

  describe('arena invariants with dynamic compatibility and re-entrant callbacks', () => {
    class ScriptedRecognizer extends GestureRecognizer {
      readonly type = 'scripted';
      compatibleWithAll = false;
      granted = false;
      cancelled = false;
      onCancelHook: (() => void) | null = null;

      onMotionEvent(): void {}

      override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
        return this.compatibleWithAll || super.canRecognizeSimultaneouslyWith(other);
      }

      begin(): boolean {
        return this.tryBegin(() => {
          this.granted = true;
        });
      }

      recognize(): boolean {
        return this.tryRecognizeDiscrete(() => {
          this.granted = true;
        });
      }

      failNow(): void {
        this.fail();
      }

      protected override onCancel(): void {
        this.cancelled = true;
        this.onCancelHook?.();
      }
    }

    const down = () =>
      arena.dispatch(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
        )!
      );

    it('denies a pending claim when an existing winner has since become incompatible', () => {
      const winner = new ScriptedRecognizer();
      winner.compatibleWithAll = true;
      const dep = new ScriptedRecognizer();
      const pending = new ScriptedRecognizer().requireFailureOf(dep);
      arena.add(winner);
      arena.add(dep);
      arena.add(pending);
      down();

      expect(winner.begin()).toBe(true);
      expect(pending.recognize()).toBe(false);
      expect(pending.state).toBe(RecognizerState.PENDING);

      winner.compatibleWithAll = false;
      dep.failNow();

      expect(pending.granted).toBe(false);
      expect(pending.state).toBe(RecognizerState.FAILED);
    });

    it('does not grant a winner that a defeated competitor detaches from its cancel callback', () => {
      const claimer = new ScriptedRecognizer();
      const victim = new ScriptedRecognizer();
      claimer.simultaneousWith(victim);
      victim.onCancelHook = () => arena.remove(claimer);
      arena.add(victim);
      arena.add(claimer);
      down();

      expect(victim.begin()).toBe(true);
      victim.requireFailureOf(claimer);

      expect(claimer.begin()).toBe(false);
      expect(victim.cancelled).toBe(true);
      expect(claimer.granted).toBe(false);
      expect(arena.getRecognizers()).not.toContain(claimer);
    });

    it('resolves transitive requireFailureOf chains regardless of pending insertion order', () => {
      const a = new ScriptedRecognizer();
      const b = new ScriptedRecognizer();
      const c = new ScriptedRecognizer();
      a.requireFailureOf(b);
      b.requireFailureOf(c);

      arena.add(a);
      arena.add(b);
      arena.add(c);
      down();

      expect(a.recognize()).toBe(false);
      expect(b.recognize()).toBe(false);
      expect(a.state).toBe(RecognizerState.PENDING);
      expect(b.state).toBe(RecognizerState.PENDING);

      c.failNow();
      expect(b.granted).toBe(true);
      expect(a.granted).toBe(false);
      expect(a.state).toBe(RecognizerState.FAILED);
    });
  });

  it('supports standalone GestureRecognizer usage without GestureArena and validates base guards', () => {
    const onPan = vi.fn();
    const onSwipe = vi.fn();
    const onTap = vi.fn();
    const standalonePan = new PanRecognizer(
      {onPan, onSwipe},
      {numPointers: 0, slop: 2, minSwipeVelocity: 200, minSwipeDistance: 20}
    );
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
    expect(onPan.mock.calls[0][0].velocityX).toBeGreaterThan(1000);
    expect(onSwipe).toHaveBeenCalledTimes(1);

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

    class GuardProbeRecognizer extends GestureRecognizer {
      readonly type = 'probe';
      exerciseGuards(): void {
        expect(this.getTouchAction()).toBe('none');
        expect(this.suppressesClick).toBe(true);
        this.emitChange(() => {});
        this.completeActive(() => {});
        this.fail();
        this.fail();
        expect(this.tryBegin(() => {})).toBe(false);
        expect(this.tryRecognizeDiscrete(() => {})).toBe(false);
        this.reset();
        this.cancel();
        this.cancel();
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
    scale.simultaneousWith(rotate);

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

  it('composes singleTap.requireFailureOf(doubleTap, quickScale)', () => {
    const onSingle = vi.fn();
    const onDouble = vi.fn();
    const onQuickScale = vi.fn();

    const doubleTap = new TapRecognizer({onTap: onDouble}, {taps: 2});
    const quickScale = new QuickScaleRecognizer({onScale: onQuickScale}, {slop: 6});
    const singleTap = new TapRecognizer({onTap: onSingle}).requireFailureOf(doubleTap, quickScale);

    arena.add(singleTap);
    arena.add(doubleTap);
    arena.add(quickScale);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 40})
      )!
    );
    expect(onSingle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(310);
    expect(onSingle).toHaveBeenCalledTimes(1);
    expect(onDouble).not.toHaveBeenCalled();
    expect(onQuickScale).not.toHaveBeenCalled();

    onSingle.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 530})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 610})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 120, timeStamp: 630})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 120, timeStamp: 650})
      )!
    );
    vi.advanceTimersByTime(350);
    expect(onQuickScale).toHaveBeenCalledTimes(1);
    expect(onSingle).not.toHaveBeenCalled();
    expect(onDouble).not.toHaveBeenCalled();
  });

  it('settles competitors before invoking a winner callback that re-entrantly removes itself', () => {
    const peerTapSpy = vi.fn();
    let competitorStateInCallback = '';
    const competitor = new LongPressRecognizer({onLongPress: vi.fn()}, {duration: 500});
    const selfRemovingTap = new TapRecognizer({
      onTap: () => {
        competitorStateInCallback = competitor.state;
        arena.remove(selfRemovingTap);
      },
    });
    const siblingTap = new TapRecognizer({onTap: peerTapSpy});
    selfRemovingTap.simultaneousWith(siblingTap);

    arena.add(competitor);
    arena.add(selfRemovingTap);
    arena.add(siblingTap);

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
    expect(competitorStateInCallback).toBe(RecognizerState.FAILED);
    expect(peerTapSpy).toHaveBeenCalledTimes(1);
  });
});
