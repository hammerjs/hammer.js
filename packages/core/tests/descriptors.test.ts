import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  doubleTap,
  gesture,
  GestureBinding,
  GestureManager,
  GestureRecognizer,
  longPress,
  pan,
  quickScale,
  resolveGestures,
  rotate,
  scale,
  tap,
} from '../src/index';
import {pointerEvent} from './test_helpers';

describe('Gesture descriptors, resolveGestures, and GestureBinding', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
    vi.useRealTimers();
  });

  it('auto-wires smart defaults in GestureManager (tap/doubleTap/quickScale/pan/scale/rotate)', () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();
    const onScale = vi.fn();
    const onRotate = vi.fn();
    const onPan = vi.fn();

    const gm = new GestureManager(element, {
      gestures: [
        tap({onTap}),
        doubleTap({onTap: onDoubleTap}),
        pan({numPointers: 0, slop: 4, onPan}),
        scale({spanSlop: 6, minSpan: 10, onScale}),
        quickScale({sensitivity: 100, onScale}),
        rotate({rotationSlop: 2, minSpan: 10, onRotate}),
      ],
    });

    // 1. Single tap waits for doubleTap + quickScale timeout before firing:
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 25})
    );
    expect(onTap).not.toHaveBeenCalled();
    vi.advanceTimersByTime(310);
    expect(onTap).toHaveBeenCalledTimes(1);

    // 2. QuickScale auto-caps default slop to pan.slop (4) and wins over Pan on stroke #2:
    onTap.mockClear();
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 50, timeStamp: 500})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 50, timeStamp: 525})
    );
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 600})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 3, clientX: 50, clientY: 56, timeStamp: 616})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 3, clientX: 50, clientY: 154, timeStamp: 632})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 3, clientX: 50, clientY: 154, timeStamp: 648})
    );
    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({isQuickScale: true}));
    expect(onPan).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();

    // 3. Simultaneous 2-finger pan(0) + scale + rotate:
    onScale.mockClear();
    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 4,
        isPrimary: true,
        clientX: 0,
        clientY: 0,
        timeStamp: 1200,
      })
    );
    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 5,
        isPrimary: false,
        clientX: 100,
        clientY: 0,
        timeStamp: 1200,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 4, clientX: 20, clientY: 10, timeStamp: 1216})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 5, clientX: 180, clientY: 80, timeStamp: 1216})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 5, clientX: 180, clientY: 80, timeStamp: 1232})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 4, clientX: 20, clientY: 10, timeStamp: 1232})
    );
    expect(onPan).toHaveBeenCalled();
    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({isQuickScale: false}));
    expect(onRotate).toHaveBeenCalled();

    gm.destroy();
  });

  it('supports explicit chained relationships and autoWire: false opt-out', () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();

    // With `autoWire: false`, single tap fires immediately without waiting for doubleTap:
    const gmNoAuto = new GestureManager(element, {
      autoWire: false,
      gestures: [tap({onTap}), doubleTap({onTap: onDoubleTap})],
    });
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 20})
    );
    expect(onTap).toHaveBeenCalledTimes(1);
    gmNoAuto.destroy();

    // Explicit `requireFailureOf` works via chaining even when `autoWire: false`:
    const onHold = vi.fn();
    const onPanStart = vi.fn();
    const hold = longPress({duration: 400, slop: 20, onLongPress: onHold});
    const drag = pan({slop: 4, onPanStart}).requireFailureOf(hold);

    const gmExplicit = new GestureManager(element, {
      autoWire: false,
      gestures: [hold, drag],
    });
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 0, clientY: 0, timeStamp: 100})
    );
    // 10px > pan.slop(4) but < hold.slop(20): drag waits in pending until hold fails or fires:
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 116})
    );
    expect(onPanStart).not.toHaveBeenCalled();

    // Exceeding hold.slop(20) fails hold and grants pending drag:
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 25, clientY: 0, timeStamp: 132})
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(onHold).not.toHaveBeenCalled();
    gmExplicit.destroy();

    // Empty resolveGestures returns []:
    expect(resolveGestures([])).toEqual([]);
  });

  it('supports custom recognizers via gesture() alongside built-in descriptors', () => {
    class InstantPressRecognizer extends GestureRecognizer {
      private readonly callbacks: {onPress?: (tag: string) => void};
      private readonly tag: string;

      constructor(callbacks: {onPress?: (tag: string) => void}, tag: string) {
        super();
        this.callbacks = callbacks;
        this.tag = tag;
      }

      protected override onDown(): void {
        this.tryRecognizeDiscrete(() => {
          this.callbacks.onPress?.(this.tag);
        });
      }
    }

    const calls: string[] = [];
    let label = 'v1';
    const makeGestures = (tag: string) => {
      const custom = gesture(
        cbs => new InstantPressRecognizer(cbs, tag),
        {onPress: t => calls.push(`${t}:${label}`)},
        {tag}
      );
      const t = tap({onTap: () => calls.push(`tap:${label}`)}).simultaneousWith(custom);
      return [custom, t];
    };

    const binding = new GestureBinding(element, makeGestures('a'));
    element.dispatchEvent(pointerEvent('pointerdown', {pointerId: 1, clientX: 10, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 10, timeStamp: 20}));
    expect(calls).toEqual(['a:v1', 'tap:v1']);

    // Callback-only update hot-swaps closure without recreating recognizer:
    const mgrBefore = binding.manager;
    label = 'v2';
    binding.update(makeGestures('a'));
    expect(binding.manager).toBe(mgrBefore);

    element.dispatchEvent(pointerEvent('pointerdown', {pointerId: 2, clientX: 10, timeStamp: 100}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 2, clientX: 10, timeStamp: 120}));
    expect(calls).toEqual(['a:v1', 'tap:v1', 'a:v2', 'tap:v2']);

    // Structural config change recreates recognizer cleanly:
    binding.update(makeGestures('b'));
    expect(binding.manager).not.toBe(mgrBefore);

    element.dispatchEvent(pointerEvent('pointerdown', {pointerId: 3, clientX: 10, timeStamp: 200}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 3, clientX: 10, timeStamp: 220}));
    expect(calls).toEqual(['a:v1', 'tap:v1', 'a:v2', 'tap:v2', 'b:v2', 'tap:v2']);

    binding.destroy();
  });

  it('GestureBinding preserves active gestures across callback/relationship re-renders and recreates on structural changes', () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seen: Array<{step: number; deltaX: number}> = [];
    const wrappedCalls = vi.fn();

    let step = 0;
    const makeList = (slop: number, includeSwipe = false) => {
      const current = step;
      const hold = longPress({duration: 500, slop: 4, onLongPress: () => {}});
      const drag = pan({
        slop,
        onPan: ev => {
          seen.push({step: current, deltaX: ev.deltaX});
          step++;
          binding.update(makeList(slop, includeSwipe), {wrapCallback});
        },
        onPanEnd,
        onPanCancel,
        ...(includeSwipe ? {onSwipe: () => {}} : {}),
      }).requireFailureOf(hold);
      return [hold, drag];
    };

    const wrapCallback = <F extends (...args: never[]) => unknown>(fn: F): F =>
      ((...args: never[]) => {
        wrappedCalls();
        return fn(...args);
      }) as F;

    const binding = new GestureBinding(element, makeList(4), {wrapCallback});
    const initialManager = binding.manager;

    element.dispatchEvent(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 24, timeStamp: 16}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 44, timeStamp: 32}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 44, timeStamp: 48}));

    expect(binding.manager).toBe(initialManager);
    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      {step: 0, deltaX: 20},
      {step: 1, deltaX: 40},
    ]);
    expect(wrappedCalls).toHaveBeenCalledTimes(3);

    // Toggling an enabled callback key recreates manager:
    binding.update(makeList(4, true), {wrapCallback});
    expect(binding.manager).not.toBe(initialManager);

    // Structural slop change recreates manager:
    const afterToggle = binding.manager;
    binding.update(makeList(12, true), {wrapCallback});
    expect(binding.manager).not.toBe(afterToggle);

    // cancel() and destroy() are safe and idempotent:
    binding.cancel();
    binding.destroy();
    binding.destroy();
    binding.update(makeList(12, true));
    expect(binding.manager).toBeNull();
  });

  it('GestureBinding diffs array options, relationship changes, and ignoreTarget transitions', () => {
    const inp = document.createElement('input');
    const blocked = document.createElement('span');
    blocked.dataset.ignore = '1';
    element.append(inp, blocked);

    let tag = 'first';
    const seen: string[] = [];
    const onTap = () => seen.push(tag);

    const binding = new GestureBinding(element, [tap({onTap})], {
      supportedPointerTypes: ['touch', 'mouse'],
      ignoreTarget: true,
    });
    const m1 = binding.manager;

    // Equal array options keep the same manager:
    binding.update([tap({onTap})], {
      supportedPointerTypes: ['touch', 'mouse'],
      ignoreTarget: true,
    });
    expect(binding.manager).toBe(m1);

    // Changing array option values or length recreates manager:
    binding.update([tap({onTap})], {
      supportedPointerTypes: ['touch'],
      ignoreTarget: true,
    });
    expect(binding.manager).not.toBe(m1);
    const m2 = binding.manager;

    // Structurally equal `update` hot-swaps closure immediately without remounting:
    tag = 'second';
    binding.update([tap({onTap: () => seen.push(tag)})], {
      supportedPointerTypes: ['touch'],
      ignoreTarget: true,
    });
    expect(binding.manager).toBe(m2);

    const doTap = (target: HTMLElement, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };
    doTap(inp, 0);
    doTap(blocked, 50);
    expect(seen).toEqual(['second']);

    // `ignoreTarget: true -> fn` recreates manager and proxies predicate:
    binding.update([tap({onTap})], {
      supportedPointerTypes: ['touch'],
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    expect(binding.manager).not.toBe(m2);
    const m3 = binding.manager;

    // Replacing predicate fn1 -> fn2 hot-swaps without remounting:
    binding.update([tap({onTap})], {
      supportedPointerTypes: ['touch'],
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    expect(binding.manager).toBe(m3);

    doTap(blocked, 100);
    doTap(inp, 150);
    expect(seen).toEqual(['second', 'second']);

    // Changing relationship edge list recreates manager:
    const a = tap({onTap});
    const b = doubleTap({onTap});
    binding.update([a, b], {autoWire: false});
    const m4 = binding.manager;
    const a2 = tap({onTap});
    const b2 = doubleTap({onTap});
    a2.requireFailureOf(b2);
    binding.update([a2, b2], {autoWire: false});
    expect(binding.manager).not.toBe(m4);

    // Dynamic `wrapCallback` updates take effect immediately without remounting:
    const wrappedHits = vi.fn();
    const wrap = <F extends (...args: never[]) => unknown>(fn: F): F =>
      ((...args: never[]) => {
        wrappedHits();
        return fn(...args);
      }) as F;
    const tapSpy = vi.fn();
    binding.update([tap({onTap: tapSpy})], {});
    const m6 = binding.manager;
    binding.update([tap({onTap: tapSpy})], {wrapCallback: wrap});
    expect(binding.manager).toBe(m6);
    doTap(element, 300);
    expect(tapSpy).toHaveBeenCalledTimes(1);
    expect(wrappedHits).toHaveBeenCalledTimes(1);

    // Duplicate peer descriptors deduplicate cleanly, and `NaN` configs stay stable:
    const dupTarget = doubleTap({onTap: () => {}});
    const dupTap = tap({onTap: () => {}}).requireFailureOf(dupTarget, dupTarget);
    expect(dupTap.requiredFailures).toHaveLength(1);

    binding.update([tap({onTap: () => {}, slop: Number.NaN})]);
    const m7 = binding.manager;
    binding.update([tap({onTap: () => {}, slop: Number.NaN})]);
    expect(binding.manager).toBe(m7);

    binding.destroy();
  });
});
