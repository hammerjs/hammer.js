import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../src/gesture_arena';
import {GestureRecognizer} from '../src/gesture_recognizer';
import type {MotionEvent} from '../src/motion_event';
import {MotionEventStream} from '../src/motion_event_stream';
import {LongPressRecognizer} from '../src/recognizers/long_press_recognizer';
import {PanRecognizer} from '../src/recognizers/pan_recognizer';
import {QuickScaleRecognizer} from '../src/recognizers/quick_scale_recognizer';
import {RotateRecognizer} from '../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../src/recognizers/scale_recognizer';
import {TapRecognizer} from '../src/recognizers/tap_recognizer';
import {pointerEvent} from './test_helpers';

describe('GestureArena conflict resolution', () => {
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

  it('prevents Tap and Pan when LongPress wins the arena, and does not activate Scale on a late 2nd finger', () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const onLongPressCancel = vi.fn();
    const onPanStart = vi.fn();
    const onScale = vi.fn();

    arena = new GestureArena([
      new TapRecognizer({onTap}, {maxTime: 1000}),
      new LongPressRecognizer({onLongPress, onLongPressCancel}, {duration: 500}),
      new PanRecognizer({onPanStart}),
      new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10}),
    ]);

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

    arena = new GestureArena([singleTap, doubleTap]);

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
    const quickScale = new QuickScaleRecognizer({onScale, onScaleEnd}, {sensitivity: 100, slop: 8});
    const singleTap = new TapRecognizer({onTap: onSingleTapConfirmed}).requireFailureOf(
      doubleTap,
      quickScale
    );

    arena = new GestureArena([
      singleTap,
      doubleTap,
      new PanRecognizer({onPan}, {slop: 8}),
      quickScale,
    ]);

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

    arena = new GestureArena([scale, rotate, pan]);

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

  it('cancels active 1-finger Pan cleanly when a 2nd finger joins', () => {
    const onPanCancel = vi.fn();
    const onScale = vi.fn();
    const onTap = vi.fn();

    arena = new GestureArena([
      new PanRecognizer({onPanCancel}, {numPointers: 1, slop: 5}),
      new TapRecognizer({onTap}, {slop: 50}),
      new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10}),
    ]);

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
    expect(onTap).not.toHaveBeenCalled();
  });

  it('cancels orphaned active winners and resets stale timers when ghost-pointer recovery dispatches a fresh DOWN', () => {
    const onPanStart = vi.fn();
    const onPanCancel = vi.fn();
    const onLongPress = vi.fn();

    arena = new GestureArena([
      new PanRecognizer({onPanStart, onPanCancel}, {slop: 4}),
      new LongPressRecognizer({onLongPress}, {duration: 500, slop: 100}),
    ]);

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

  it('handles duplicate registration, unattached dependencies, and competing pending claims', () => {
    const onFirstPending = vi.fn();
    const onSecondPending = vi.fn();
    const blocker = new TapRecognizer({onTap: () => {}}, {taps: 2, multiTapInterval: 300});
    const pendingA = new TapRecognizer({onTap: onFirstPending}).requireFailureOf(blocker);
    const pendingB = new TapRecognizer({onTap: onSecondPending}).requireFailureOf(blocker);
    const unattachedDep = new TapRecognizer({onTap: () => {}});
    pendingA.requireFailureOf(unattachedDep, pendingA);

    arena = new GestureArena([blocker, blocker, pendingA, pendingB]);
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
    expect(pendingA.state).toBe('pending');
    expect(pendingB.state).toBe('pending');

    vi.advanceTimersByTime(300);
    expect(onFirstPending).toHaveBeenCalledTimes(1);
    expect(onSecondPending).not.toHaveBeenCalled();
    expect(pendingB.state).toBe('failed');

    arena.reset();
    expect(pendingA.state).toBe('possible');
  });

  describe('arena invariants with dynamic compatibility and dependencies', () => {
    class ScriptedRecognizer extends GestureRecognizer {
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

    const down = (target: GestureArena) =>
      target.dispatch(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
        )!
      );

    it('defeats late claims when an existing winner is incompatible or a required dependency already won', () => {
      const winner = new ScriptedRecognizer();
      winner.compatibleWithAll = true;
      const incompatibleLate = new ScriptedRecognizer();
      const defeatedDepLate = new ScriptedRecognizer();
      defeatedDepLate.simultaneousWith(winner, defeatedDepLate);

      const target = new GestureArena([winner, incompatibleLate, defeatedDepLate]);
      arena = target;
      down(target);

      expect(winner.begin()).toBe(true);
      winner.compatibleWithAll = false;
      defeatedDepLate.requireFailureOf(winner);

      expect(incompatibleLate.recognize()).toBe(false);
      expect(incompatibleLate.granted).toBe(false);
      expect(incompatibleLate.state).toBe('failed');
      expect(defeatedDepLate.recognize()).toBe(false);
      expect(defeatedDepLate.granted).toBe(false);
      expect(defeatedDepLate.state).toBe('failed');
    });

    it('denies a pending claim when an existing winner has since become incompatible', () => {
      const winner = new ScriptedRecognizer();
      winner.compatibleWithAll = true;
      const dep = new ScriptedRecognizer();
      const pending = new ScriptedRecognizer().requireFailureOf(dep);
      const target = new GestureArena([winner, dep, pending]);
      arena = target;
      down(target);

      expect(winner.begin()).toBe(true);
      expect(pending.recognize()).toBe(false);
      expect(pending.state).toBe('pending');

      winner.compatibleWithAll = false;
      dep.failNow();

      expect(pending.granted).toBe(false);
      expect(pending.state).toBe('failed');
    });

    it('cancels active dependents and transitions the claimer before invoking cancel callbacks', () => {
      const claimer = new ScriptedRecognizer();
      const victimA = new ScriptedRecognizer();
      const victimB = new ScriptedRecognizer();
      claimer.simultaneousWith(victimA, victimB);
      victimA.simultaneousWith(victimB);

      let claimerStateDuringACancel = '';
      victimA.onCancelHook = () => {
        claimerStateDuringACancel = claimer.state;
      };

      const target = new GestureArena([victimA, victimB, claimer]);
      arena = target;
      down(target);

      expect(victimA.begin()).toBe(true);
      expect(victimB.begin()).toBe(true);
      victimA.requireFailureOf(claimer);
      victimB.requireFailureOf(claimer);

      expect(claimer.begin()).toBe(true);
      expect(claimerStateDuringACancel).toBe('began');
      expect(victimA.cancelled).toBe(true);
      expect(victimB.cancelled).toBe(true);
      expect(claimer.granted).toBe(true);
    });

    it('cancels all simultaneous active recognizers on a cancel event', () => {
      const recA = new ScriptedRecognizer();
      const recB = new ScriptedRecognizer();
      recA.simultaneousWith(recB);

      const target = new GestureArena([recA, recB]);
      arena = target;
      down(target);

      expect(recA.begin()).toBe(true);
      expect(recB.begin()).toBe(true);

      target.dispatch(
        stream.onPointerCancel(
          pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 16})
        )!
      );

      expect(target.hasActiveGesture).toBe(false);
      expect(recA.cancelled).toBe(true);
      expect(recB.cancelled).toBe(true);
    });

    it('resolves transitive requireFailureOf chains regardless of pending insertion order', () => {
      const a = new ScriptedRecognizer();
      const b = new ScriptedRecognizer();
      const c = new ScriptedRecognizer();
      a.requireFailureOf(b);
      b.requireFailureOf(c);

      const target = new GestureArena([a, b, c]);
      arena = target;
      down(target);

      expect(a.recognize()).toBe(false);
      expect(b.recognize()).toBe(false);
      expect(a.state).toBe('pending');
      expect(b.state).toBe('pending');

      c.failNow();
      expect(b.granted).toBe(true);
      expect(a.granted).toBe(false);
      expect(a.state).toBe('failed');
    });
  });

  it('requires GestureArena attachment to grant gestures and validates base guards', () => {
    const onPan = vi.fn();
    const onTap = vi.fn();
    const detachedPan = new PanRecognizer({onPan}, {slop: 2});
    const detachedTap = new TapRecognizer({onTap});

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
      detachedPan.onMotionEvent(ev);
    }
    expect(onPan).not.toHaveBeenCalled();

    stream.reset();
    const td = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 5, clientY: 5, timeStamp: 0})
    )!;
    const tu = stream.onPointerUp(
      pointerEvent('pointerup', {pointerId: 1, clientX: 5, clientY: 5, timeStamp: 20})
    )!;
    detachedTap.onMotionEvent(td);
    detachedTap.onMotionEvent(tu);
    expect(onTap).not.toHaveBeenCalled();

    class GuardProbeRecognizer extends GestureRecognizer {
      exerciseGuards(): void {
        expect(this.getTouchAction()).toBe('none');
        expect(this.suppressesClick).toBe(true);
        expect(this.tryBegin(() => {})).toBe(false);
        expect(this.tryRecognizeDiscrete(() => {})).toBe(false);
        expect(this.emitChange()).toBe(false);
        expect(this.completeActive()).toBe(false);
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

    arena = new GestureArena([pan, scale, rotate]);

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

    arena = new GestureArena([singleTap, doubleTap, quickScale]);

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

  it('settles competitors before invoking winner callback while keeping simultaneous peers eligible', () => {
    const peerTapSpy = vi.fn();
    let competitorStateInCallback = '';
    const competitor = new LongPressRecognizer({onLongPress: vi.fn()}, {duration: 500});
    const winningTap = new TapRecognizer({
      onTap: () => {
        competitorStateInCallback = competitor.state;
      },
    });
    const siblingTap = new TapRecognizer({onTap: peerTapSpy});
    winningTap.simultaneousWith(siblingTap);

    arena = new GestureArena([competitor, winningTap, siblingTap]);

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
    expect(competitorStateInCallback).toBe('failed');
    expect(peerTapSpy).toHaveBeenCalledTimes(1);
  });

  it('never phantom-starts pending continuous claims after liftoff and grants them while pointer stays down', () => {
    const onPanStart = vi.fn();
    const onPan = vi.fn();
    const onPanEnd = vi.fn();

    const longPress = new LongPressRecognizer({onLongPress: vi.fn()}, {slop: 25, duration: 500});
    const pan = new PanRecognizer({onPanStart, onPan, onPanEnd}, {slop: 5}).requireFailureOf(
      longPress
    );

    arena = new GestureArena([longPress, pan]);

    // 1. Move past pan.slop (12 > 5) while longPress (< 25) keeps pan in `'pending'`, then lift:
    arena.dispatch(
      stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
    );
    arena.dispatch(
      stream.onPointerMove(pointerEvent('pointermove', {pointerId: 1, clientX: 12, timeStamp: 16}))!
    );
    expect(pan.state).toBe('pending');

    arena.dispatch(
      stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 12, timeStamp: 32}))!
    );
    expect(pan.state).toBe('failed');
    expect(pan.active).toBe(false);
    expect(onPanStart).not.toHaveBeenCalled();

    // 2. When dependency fails while pointer remains down, pending pan starts with the fresh
    // grant event (not the stale pending event), immediately emits onPan, and finishes cleanly:
    arena.dispatch(
      stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 300}))!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 12, timeStamp: 316})
      )!
    );
    expect(pan.state).toBe('pending');
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 30, timeStamp: 332})
      )!
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(onPanStart).toHaveBeenLastCalledWith(
      expect.objectContaining({center: {x: 30, y: 0}, deltaX: 0})
    );
    expect(onPan).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenLastCalledWith(
      expect.objectContaining({center: {x: 30, y: 0}, deltaX: 25, stepX: 25})
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 40, timeStamp: 348})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 40, timeStamp: 364}))!
    );
    expect(onPan).toHaveBeenCalledTimes(2);
    expect(onPan).toHaveBeenLastCalledWith(
      expect.objectContaining({center: {x: 40, y: 0}, deltaX: 35, stepX: 10})
    );
    expect(onPanEnd).toHaveBeenCalledTimes(1);
  });

  it('does not let a prior stream delayed singleTap kill LongPress or Scale in the next stream', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();
    const onLongPress = vi.fn();
    const onPan = vi.fn();
    const onScale = vi.fn();

    const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2});
    const singleTap = new TapRecognizer({onTap: onSingleTap}).requireFailureOf(doubleTap);
    const longPress = new LongPressRecognizer({onLongPress}, {duration: 500});
    const pan = new PanRecognizer({onPan}, {slop: 4});
    const scale = new ScaleRecognizer({onScale}, {spanSlop: 4, minSpan: 10});

    arena = new GestureArena([singleTap, doubleTap, longPress, pan, scale]);

    // 1. Tap #1 followed 100ms later by a 500ms LongPress:
    // At +250ms, doubleTap times out and Tap #1's singleTap resolves — LongPress must survive!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 20})
      )!
    );
    expect(onSingleTap).not.toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 20, clientY: 20, timeStamp: 120})
      )!
    );
    vi.advanceTimersByTime(260);
    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(longPress.state).toBe('possible');

    vi.advanceTimersByTime(250);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 20, clientY: 20, timeStamp: 650})
      )!
    );

    // 2. Tap #1 followed 100ms later by a 2-finger pinch Scale:
    // 2nd finger pointer_down fails doubleTap and resolves Tap #1's singleTap — Scale must survive!
    onSingleTap.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 1000})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 1020})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 4, clientX: 50, clientY: 50, timeStamp: 1100})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 5,
          isPrimary: false,
          clientX: 150,
          clientY: 50,
          timeStamp: 1110,
        })
      )!
    );
    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(scale.state).toBe('possible');

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {
          pointerId: 5,
          isPrimary: false,
          clientX: 220,
          clientY: 50,
          timeStamp: 1130,
        })
      )!
    );
    expect(onScale).toHaveBeenCalled();

    // 3. Tap #1 followed 100ms later by an immediate fast Pan:
    // Pan winning stroke #2 denies doubleTap, so Tap #1's singleTap resolves AND Pan continues:
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {
          pointerId: 5,
          isPrimary: false,
          clientX: 220,
          clientY: 50,
          timeStamp: 1150,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 4, clientX: 50, clientY: 50, timeStamp: 1160})
      )!
    );
    onSingleTap.mockClear();
    onPan.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 6, clientX: 50, clientY: 50, timeStamp: 2000})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 6, clientX: 50, clientY: 50, timeStamp: 2020})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 7, clientX: 50, clientY: 50, timeStamp: 2100})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 7, clientX: 90, clientY: 50, timeStamp: 2116})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 7, clientX: 90, clientY: 50, timeStamp: 2132})
      )!
    );
    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenCalledTimes(1);
  });

  it('denies QuickScaleRecognizer when a non-tap gesture wins on stroke #1', () => {
    const onPan = vi.fn();
    const onScale = vi.fn();

    const pan = new PanRecognizer({onPan}, {slop: 4});
    const quickScale = new QuickScaleRecognizer({onScale}, {slop: 10, sensitivity: 100});
    arena = new GestureArena([pan, quickScale]);

    // Stroke #1: short 6px pan (< quickScale.slop 10, < 250ms) — Pan wins and must deny QuickScale:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 56, timeStamp: 20})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 56, timeStamp: 40})
      )!
    );
    expect(onPan).toHaveBeenCalledTimes(1);

    // Stroke #2 within 300ms: vertical drag must be recognized by Pan, NOT QuickScale:
    onPan.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 56, timeStamp: 120})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 160, timeStamp: 150})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 160, timeStamp: 170})
      )!
    );
    expect(onPan).toHaveBeenCalledTimes(1);
    expect(onScale).not.toHaveBeenCalled();
  });

  it('decouples gestureKind from suppressesClick for QuickScale stroke #1 coexistence', () => {
    class NonSuppressingContinuous extends GestureRecognizer {
      override get suppressesClick(): boolean {
        return false;
      }
      protected override onMove(): void {
        this.tryBegin(() => {});
      }
    }

    const onScale = vi.fn();
    const continuous = new NonSuppressingContinuous();
    const quickScale = new QuickScaleRecognizer({onScale}, {slop: 10, sensitivity: 100});
    arena = new GestureArena([continuous, quickScale]);

    // Stroke #1: continuous recognizer with `suppressesClick: false` wins and must still deny QuickScale:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 54, timeStamp: 16})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 54, timeStamp: 32})
      )!
    );
    expect(continuous.active).toBe(true);
    expect(quickScale.state).toBe('failed');

    // Stroke #2 within 300ms must not arm QuickScale:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 54, timeStamp: 120})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 160, timeStamp: 150})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 160, timeStamp: 170})
      )!
    );
    expect(onScale).not.toHaveBeenCalled();
  });

  it('settles competing prior-stream pending claims without defeating the active new stream', () => {
    const onFirstSingle = vi.fn();
    const onSecondSingle = vi.fn();
    const onPan = vi.fn();

    const doubleTap = new TapRecognizer({onTap: vi.fn()}, {taps: 2});
    const firstSingle = new TapRecognizer({onTap: onFirstSingle}).requireFailureOf(doubleTap);
    const secondSingle = new TapRecognizer({onTap: onSecondSingle}).requireFailureOf(doubleTap);
    const pan = new PanRecognizer({onPan}, {slop: 4});

    arena = new GestureArena([firstSingle, secondSingle, doubleTap, pan]);

    // Stream #1: tap puts both incompatible single taps into `pending` waiting on `doubleTap`.
    arena.dispatch(
      stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 10, timeStamp: 0}))!
    );
    arena.dispatch(
      stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 10, timeStamp: 20}))!
    );
    expect(firstSingle.state).toBe('pending');
    expect(secondSingle.state).toBe('pending');

    // Stream #2 starts near tap #1 so `doubleTap` survives `down` and increments `streamId`.
    // Then a 2nd finger `pointer_down` fails `doubleTap`, so stream #1's `firstSingle` resolves
    // (entering the prior-stream branch) and denies stream #1's `secondSingle` while stream #2's
    // `pan` stays alive!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 10, timeStamp: 100})
      )!
    );
    expect(firstSingle.state).toBe('pending');
    expect(secondSingle.state).toBe('pending');

    vi.advanceTimersByTime(310);
    expect(onFirstSingle).toHaveBeenCalledTimes(1);
    expect(onSecondSingle).not.toHaveBeenCalled();
    expect(secondSingle.state).toBe('failed');

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 40, timeStamp: 420})
      )!
    );
    expect(onPan).toHaveBeenCalledTimes(1);
  });

  it('starts pending Scale and Rotate with the fresh grant event when a 2-finger dependency fails', () => {
    const onScaleStart = vi.fn();
    const onScale = vi.fn();
    const onRotateStart = vi.fn();
    const onRotate = vi.fn();

    const hold2 = new LongPressRecognizer({onLongPress: vi.fn()}, {numPointers: 2, slop: 40});
    const scale = new ScaleRecognizer(
      {onScaleStart, onScale},
      {spanSlop: 10, minSpan: 20}
    ).requireFailureOf(hold2);
    const rotate = new RotateRecognizer({onRotateStart, onRotate}, {rotationSlop: 5, minSpan: 20})
      .requireFailureOf(hold2)
      .simultaneousWith(scale);

    arena = new GestureArena([hold2, scale, rotate]);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 0})
      )!
    );
    // Move finger 2 by ~27px (< hold2.slop 40) with ~10 deg angle & +20px span -> both enter pending:
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 118, clientY: 20, timeStamp: 16})
      )!
    );
    expect(scale.state).toBe('pending');
    expect(rotate.state).toBe('pending');

    // Move finger 2 to (150, 100) (> hold2.slop 40) -> hold2 fails, granting both with fresh grantEvent:
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 150, clientY: 100, timeStamp: 32})
      )!
    );
    expect(onScaleStart).toHaveBeenCalledTimes(1);
    expect(onScaleStart).toHaveBeenLastCalledWith(
      expect.objectContaining({center: {x: 75, y: 50}})
    );
    expect(onScale).toHaveBeenCalledTimes(1);
    expect(onScale.mock.calls[0][0].scale).toBeCloseTo(Math.hypot(150, 100) / 110, 3);

    expect(onRotateStart).toHaveBeenCalledTimes(1);
    expect(onRotateStart).toHaveBeenLastCalledWith(
      expect.objectContaining({center: {x: 75, y: 50}})
    );
    expect(onRotate).toHaveBeenCalledTimes(1);
    const expectedDeg = (Math.atan2(100, 150) * 180) / Math.PI - 5;
    expect(onRotate.mock.calls[0][0].rotation).toBeCloseTo(expectedDeg, 2);
  });
});
