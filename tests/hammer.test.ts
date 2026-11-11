import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Hammer} from '../src/index';
import {pointerEvent} from './test_helpers';

describe('Hammer', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it('registers only requested recognizers and leaves empty instances passive', () => {
    const empty = new Hammer(element);
    expect(empty.element).toBe(element);
    expect(empty.computeTouchAction()).toBe('auto');
    expect(element.style.touchAction || '').toBe('');
    expect(empty.config.touchSlop).toBe(8);
    empty.reset();
    empty.destroy();

    const onTap = vi.fn();
    const tapOnly = new Hammer(element, {
      onTap,
      supportedPointerTypes: ['touch'],
      viewConfiguration: {tapSlop: 14},
    });
    expect(tapOnly.config.tapSlop).toBe(14);
    expect(tapOnly.computeTouchAction()).toBe('manipulation');
    expect(element.style.touchAction).toBe('manipulation');
    expect(element.style.userSelect || '').toBe('');

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 1, timeStamp: 0})
    );
    element.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'mouse', pointerId: 1, timeStamp: 20})
    );
    expect(onTap).not.toHaveBeenCalled();

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 2, timeStamp: 50})
    );
    element.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'touch', pointerId: 2, timeStamp: 70})
    );
    expect(onTap).toHaveBeenCalledTimes(1);
    tapOnly.destroy();
  });

  it('waits for double-tap failure before firing onTap by default', () => {
    vi.useFakeTimers();
    try {
      const onTap = vi.fn();
      const onTapDown = vi.fn();
      const onShowPress = vi.fn();
      const onDoubleTap = vi.fn();
      const hammer = new Hammer(element, {onTap, onTapDown, onShowPress, onDoubleTap});

      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
      );
      element.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 30})
      );
      expect(onTapDown).toHaveBeenCalledTimes(1);
      expect(onTap).not.toHaveBeenCalled();

      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 12, clientY: 12, timeStamp: 100})
      );
      element.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 2, clientX: 12, clientY: 12, timeStamp: 130})
      );
      expect(onDoubleTap).toHaveBeenCalledTimes(1);
      expect(onTap).not.toHaveBeenCalled();

      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 20, clientY: 20, timeStamp: 600})
      );
      vi.advanceTimersByTime(hammer.config.tapTimeout + 5);
      expect(onShowPress).toHaveBeenCalledTimes(1);

      element.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 3, clientX: 20, clientY: 20, timeStamp: 790})
      );
      expect(onTap).not.toHaveBeenCalled();
      vi.advanceTimersByTime(hammer.config.doubleTapTimeout + 5);
      expect(onTap).toHaveBeenCalledTimes(1);
      hammer.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onTap immediately alongside onDoubleTap when requireDoubleTapFailure is false', () => {
    const onTap = vi.fn();
    const onDoubleTap = vi.fn();
    const hammer = new Hammer(element, {
      onTap,
      onDoubleTap,
      requireDoubleTapFailure: false,
    });

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
    );
    element.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 20})
    );
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 10, clientY: 10, timeStamp: 100})
    );
    element.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 10, clientY: 10, timeStamp: 120})
    );
    expect(onTap).toHaveBeenCalledTimes(2);
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    hammer.destroy();
  });

  it('computes touch-action from pan.direction and dispatches onPan and onSwipe', () => {
    const checkTouchAction = (
      opts: ConstructorParameters<typeof Hammer>[1],
      expected: string
    ): void => {
      const h = new Hammer(element, opts);
      expect(h.computeTouchAction()).toBe(expected);
      h.destroy();
    };

    checkTouchAction({onPan: () => {}}, 'none');
    checkTouchAction({onSwipe: () => {}}, 'none');
    checkTouchAction({onPanEnd: () => {}}, 'none');
    checkTouchAction({onPan: () => {}, pan: {direction: 'horizontal'}}, 'pan-y pinch-zoom');
    checkTouchAction({onPan: () => {}, pan: {direction: 'vertical'}}, 'pan-x pinch-zoom');
    checkTouchAction({onSwipe: () => {}, pan: {direction: 'both'}}, 'none');

    const onPanStart = vi.fn();
    const onPan = vi.fn();
    const onPanEnd = vi.fn();
    const onSwipe = vi.fn();

    const hammer = new Hammer(element, {
      onPanStart,
      onPan,
      onPanEnd,
      onSwipe,
      pan: {direction: 'horizontal', slop: 4, minSwipeVelocity: 200, minSwipeDistance: 20},
    });

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 110, timeStamp: 15})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 110, timeStamp: 20})
    );
    expect(onPanStart).not.toHaveBeenCalled();
    expect(onSwipe).not.toHaveBeenCalled();

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 100, timeStamp: 100})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 60, clientY: 100, timeStamp: 110})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 20, clientY: 100, timeStamp: 120})
    );

    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenCalledTimes(1);
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({direction: 'left', axis: 'horizontal'})
    );
    hammer.destroy();
  });

  it('pairs scale, rotate, and multi-pointer pan simultaneously and forwards quickScale to onScale', () => {
    const onTap = vi.fn();
    const onScale = vi.fn();
    const onRotate = vi.fn();
    const onPan = vi.fn();

    const hammer = new Hammer(element, {
      onTap,
      onPan,
      onScale,
      onRotate,
      pan: {numPointers: 0, slop: 4},
      scale: {spanSlop: 6, minSpan: 10},
      rotate: {rotationSlop: 2, minSpan: 10},
      quickScale: {sensitivity: 100, slop: 6},
    });

    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 1,
        isPrimary: true,
        clientX: 0,
        clientY: 0,
        timeStamp: 0,
      })
    );
    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 2,
        isPrimary: false,
        clientX: 100,
        clientY: 0,
        timeStamp: 0,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 10, timeStamp: 16})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 180, clientY: 80, timeStamp: 16})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 180, clientY: 80, timeStamp: 32})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 10, timeStamp: 32})
    );

    expect(onPan).toHaveBeenCalled();
    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({isQuickScale: false}));
    expect(onRotate).toHaveBeenCalled();

    onScale.mockClear();
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 500})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 530})
    );
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 4, clientX: 50, clientY: 50, timeStamp: 600})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 4, clientX: 50, clientY: 156, timeStamp: 630})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 4, clientX: 50, clientY: 156, timeStamp: 650})
    );

    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({isQuickScale: true}));
    expect(onTap).not.toHaveBeenCalled();
    hammer.destroy();

    const qsOnly = new Hammer(element, {onQuickScale: vi.fn()});
    expect(qsOnly.computeTouchAction()).toBe('manipulation');
    qsOnly.destroy();
  });

  it('wires LongPress lifecycle callbacks and respects touchAction: false', () => {
    vi.useFakeTimers();
    try {
      const onLongPressMove = vi.fn();
      const onLongPressUp = vi.fn();
      const hammer = new Hammer(element, {
        touchAction: false,
        onLongPressMove,
        onLongPressUp,
        longPress: {duration: 300},
      });
      expect(element.style.touchAction || '').toBe('');

      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
      );
      vi.advanceTimersByTime(310);

      document.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 1, clientX: 35, clientY: 10, timeStamp: 330})
      );
      document.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 1, clientX: 35, clientY: 10, timeStamp: 350})
      );

      expect(onLongPressMove).toHaveBeenCalledWith(expect.objectContaining({deltaX: 25}));
      expect(onLongPressUp).toHaveBeenCalledTimes(1);
      hammer.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('aligns quickScale slop with tighter pan slop, honors quickScale: false, and avoids pending tap claims when onTap is omitted', () => {
    const onPan = vi.fn();
    const onPanCancel = vi.fn();
    const onScale = vi.fn();
    const hammer = new Hammer(element, {
      onPan,
      onPanCancel,
      onScale,
      pan: {slop: 4},
      scale: {spanSlop: 4, minSpan: 10},
      quickScale: true,
    });

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 25})
    );
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 50, timeStamp: 100})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 52, timeStamp: 108})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 56, timeStamp: 116})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 50, clientY: 120, timeStamp: 132})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 50, clientY: 120, timeStamp: 140})
    );

    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({isQuickScale: true}));
    expect(onPan).not.toHaveBeenCalled();

    onScale.mockClear();
    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 3,
        isPrimary: true,
        clientX: 50,
        clientY: 50,
        timeStamp: 600,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerId: 3,
        isPrimary: true,
        clientX: 70,
        clientY: 50,
        timeStamp: 620,
      })
    );
    expect(onPan).toHaveBeenCalledTimes(1);

    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 4,
        isPrimary: false,
        clientX: 120,
        clientY: 50,
        timeStamp: 640,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerId: 4,
        isPrimary: false,
        clientX: 180,
        clientY: 50,
        timeStamp: 660,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {
        pointerId: 4,
        isPrimary: false,
        clientX: 180,
        clientY: 50,
        timeStamp: 680,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {
        pointerId: 3,
        isPrimary: true,
        clientX: 70,
        clientY: 50,
        timeStamp: 680,
      })
    );
    expect(onPanCancel).toHaveBeenCalledTimes(1);
    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({isQuickScale: false}));
    hammer.destroy();

    const onTap = vi.fn();
    const onQuickScale = vi.fn();
    const disabledQs = new Hammer(element, {onTap, onQuickScale, quickScale: false});
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 5, clientX: 10, clientY: 10, timeStamp: 1000})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 5, clientX: 10, clientY: 10, timeStamp: 1020})
    );
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onQuickScale).not.toHaveBeenCalled();
    disabledQs.destroy();

    const onTapDown = vi.fn();
    const onDoubleTap = vi.fn();
    const feedbackAndDouble = new Hammer(element, {onTapDown, onDoubleTap});
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 6, clientX: 10, clientY: 10, timeStamp: 1500})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 6, clientX: 10, clientY: 10, timeStamp: 1520})
    );
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 7, clientX: 10, clientY: 10, timeStamp: 1600})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 7, clientX: 10, clientY: 10, timeStamp: 1620})
    );
    expect(onTapDown).toHaveBeenCalledTimes(2);
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    feedbackAndDouble.destroy();

    vi.useFakeTimers();
    try {
      const downWithTap = vi.fn();
      const showPressWithTap = vi.fn();
      const confirmedTap = vi.fn();
      const confirmedDouble = vi.fn();
      const fullTapHammer = new Hammer(element, {
        onTapDown: downWithTap,
        onShowPress: showPressWithTap,
        onTap: confirmedTap,
        onDoubleTap: confirmedDouble,
      });
      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 8, clientX: 10, clientY: 10, timeStamp: 2000})
      );
      document.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 8, clientX: 10, clientY: 10, timeStamp: 2020})
      );
      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 9, clientX: 10, clientY: 10, timeStamp: 2100})
      );
      vi.advanceTimersByTime(190);
      expect(showPressWithTap).toHaveBeenCalledTimes(1);
      document.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 9, clientX: 10, clientY: 10, timeStamp: 2290})
      );
      expect(downWithTap).toHaveBeenCalledTimes(2);
      expect(confirmedDouble).toHaveBeenCalledTimes(1);
      expect(confirmedTap).not.toHaveBeenCalled();
      fullTapHammer.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports SVGElement targets and in-place setOptions updates mid-gesture', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);

    const calls: string[] = [];
    const hammer = new Hammer(svg, {
      onTap: () => calls.push('tap1'),
      onDoubleTap: () => calls.push('dbl1'),
      onLongPress: () => calls.push('lp1'),
      onPan: ev => calls.push(`v1:${ev.deltaX}`),
      onScale: ev => calls.push(`scale:${ev.scale.toFixed(1)}`),
      onRotate: () => calls.push('rot1'),
      quickScale: true,
      pan: {numPointers: 0, slop: 4},
      scale: {spanSlop: 8, minSpan: 20},
    });
    expect(hammer.element).toBe(svg);

    // Start an active 1-finger pan, then swap closures via `setOptions` mid-drag without interruption:
    svg.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 14, clientY: 0, timeStamp: 10})
    );
    expect(calls).toEqual(['v1:10']);

    hammer.setOptions({
      onTap: () => calls.push('tap2'),
      onDoubleTap: () => calls.push('dbl2'),
      onLongPress: () => calls.push('lp2'),
      onPan: ev => calls.push(`v2:${ev.deltaX}`),
      onScale: ev => calls.push(`scale2:${ev.scale.toFixed(1)}`),
      onRotate: () => calls.push('rot2'),
      quickScale: true,
      pan: {numPointers: 0, slop: 4},
      scale: {spanSlop: 8, minSpan: 20},
    });

    // Active pan continues smoothly with the updated callback and coexists with 2-finger scale:
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 24, clientY: 0, timeStamp: 20})
    );
    svg.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 2,
        isPrimary: false,
        clientX: 124,
        clientY: 0,
        timeStamp: 25,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerId: 2,
        isPrimary: false,
        clientX: 240,
        clientY: 0,
        timeStamp: 35,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, isPrimary: false, clientX: 240, clientY: 0})
    );
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 24, clientY: 0}));
    expect(calls).toContain('v2:20');
    expect(calls).toContain('scale2:2.0');

    // Changing recognizer topology via `setOptions` recomputes `touch-action` dynamically:
    hammer.setOptions({
      onPan: () => {},
      pan: {direction: 'horizontal'},
      touchAction: 'none',
      viewConfiguration: {touchSlop: 14},
    });
    expect(hammer.computeTouchAction()).toBe('pan-y pinch-zoom');
    expect(svg.style.touchAction).toBe('none');
    expect(hammer.config.touchSlop).toBe(14);

    // Omitting `touchAction` and `viewConfiguration` in `Hammer.setOptions` restores defaults:
    hammer.setOptions({
      onPan: () => {},
      pan: {direction: 'horizontal'},
    });
    expect(svg.style.touchAction).toBe('pan-y pinch-zoom');
    expect(hammer.config.touchSlop).toBe(8);

    hammer.destroy();
    svg.remove();
  });
});
