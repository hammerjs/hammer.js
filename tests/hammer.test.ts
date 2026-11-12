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
    expect(empty.manager.computeTouchAction()).toBe('auto');
    expect(element.style.touchAction || '').toBe('');
    expect(empty.manager.config.touchSlop).toBe(8);
    empty.manager.reset();
    empty.destroy();

    const onTap = vi.fn();
    const tapOnly = new Hammer(element, {
      onTap,
      supportedPointerTypes: ['touch'],
      viewConfiguration: {touchSlop: 14},
    });
    expect(tapOnly.manager.config.touchSlop).toBe(14);
    expect(tapOnly.manager.computeTouchAction()).toBe('manipulation');
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

  it('waits for double-tap failure before firing onTap', () => {
    vi.useFakeTimers();
    try {
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();
      const hammer = new Hammer(element, {onTap, onDoubleTap});

      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
      );
      element.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 30})
      );
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
      element.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 3, clientX: 20, clientY: 20, timeStamp: 630})
      );
      expect(onTap).not.toHaveBeenCalled();
      vi.advanceTimersByTime(hammer.manager.config.doubleTapTimeout + 5);
      expect(onTap).toHaveBeenCalledTimes(1);
      hammer.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('computes touch-action from pan.direction and dispatches onPan and onSwipe', () => {
    const checkTouchAction = (
      opts: ConstructorParameters<typeof Hammer>[1],
      expected: string
    ): void => {
      const h = new Hammer(element, opts);
      expect(h.manager.computeTouchAction()).toBe(expected);
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
    expect(onSwipe).toHaveBeenCalledWith(expect.objectContaining({direction: 'left'}));
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

  it('supports explicit quickScale options, honors quickScale: false, and avoids pending tap claims when onTap is omitted', () => {
    const onPan = vi.fn();
    const onPanCancel = vi.fn();
    const onScale = vi.fn();
    const hammer = new Hammer(element, {
      onPan,
      onPanCancel,
      onScale,
      pan: {slop: 4},
      scale: {spanSlop: 4, minSpan: 10},
      quickScale: {slop: 4},
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
    const onScaleDisabledQs = vi.fn();
    const disabledQs = new Hammer(element, {onTap, onScale: onScaleDisabledQs, quickScale: false});
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 5, clientX: 10, clientY: 10, timeStamp: 1000})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 5, clientX: 10, clientY: 10, timeStamp: 1020})
    );
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onScaleDisabledQs).not.toHaveBeenCalled();
    disabledQs.destroy();
  });

  it('supports SVGElement targets and setOptions reconfiguration', () => {
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

    svg.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 14, clientY: 0, timeStamp: 10})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 14, clientY: 0, timeStamp: 15})
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

    svg.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 20})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 24, clientY: 0, timeStamp: 25})
    );
    svg.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 2,
        isPrimary: false,
        clientX: 124,
        clientY: 0,
        timeStamp: 30,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerId: 2,
        isPrimary: false,
        clientX: 240,
        clientY: 0,
        timeStamp: 40,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, isPrimary: false, clientX: 240, clientY: 0})
    );
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 24, clientY: 0}));
    expect(calls).toContain('v2:20');
    expect(calls).toContain('scale2:2.0');

    // Changing recognizer topology via `setOptions` recomputes `touch-action`:
    hammer.setOptions({
      onPan: () => {},
      pan: {direction: 'horizontal'},
      touchAction: 'none',
      viewConfiguration: {touchSlop: 14},
    });
    expect(hammer.manager.computeTouchAction()).toBe('pan-y pinch-zoom');
    expect(svg.style.touchAction).toBe('none');
    expect(hammer.manager.config.touchSlop).toBe(14);

    // Omitting `touchAction` and `viewConfiguration` in `Hammer.setOptions` restores defaults:
    hammer.setOptions({
      onTap: () => calls.push('tap3'),
      onPan: () => {},
      pan: {direction: 'vertical'},
    });
    expect(svg.style.touchAction).toBe('pan-x pinch-zoom');
    expect(hammer.manager.config.touchSlop).toBe(8);
    svg.dispatchEvent(pointerEvent('pointerdown', {pointerId: 9, clientX: 5, clientY: 5}));
    svg.dispatchEvent(pointerEvent('pointerup', {pointerId: 9, clientX: 5, clientY: 5}));
    expect(calls).toContain('tap3');

    hammer.destroy();
    svg.remove();
  });
});
