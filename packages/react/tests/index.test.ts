import {doubleTap, longPress, pan, tap} from '@hammerjs/core';
import {act, cleanup, render} from '@testing-library/react';
import {StrictMode, createElement, useState, type RefCallback} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useGestures, type GesturesOptions} from '../src/index.js';

interface MockPointerInit {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  timeStamp?: number;
  pointerType?: string;
}

function pointerEvent(type: string, init: MockPointerInit = {}): PointerEvent {
  const ev = new Event(type, {bubbles: true, cancelable: true, composed: true}) as PointerEvent;
  Object.defineProperties(ev, {
    pointerId: {value: init.pointerId ?? 1},
    clientX: {value: init.clientX ?? 0},
    clientY: {value: init.clientY ?? 0},
    pointerType: {value: init.pointerType ?? 'touch'},
    button: {value: 0},
    ctrlKey: {value: false},
    isPrimary: {value: true},
    ...(init.timeStamp !== undefined ? {timeStamp: {value: init.timeStamp}} : {}),
  });
  return ev;
}

describe('@hammerjs/react useGestures', () => {
  afterEach(cleanup);

  it('attaches via callback ref, handles gestures, keeps stable ref identity, and cleans up on unmount', () => {
    const onTap = vi.fn();
    const seenRefs: Array<RefCallback<HTMLDivElement>> = [];

    function Demo({label}: {label: string}) {
      const ref = useGestures<HTMLDivElement>([tap({onTap})]);
      seenRefs.push(ref);
      return createElement('div', {ref, 'data-testid': 'surface'}, label);
    }

    const {getByTestId, rerender, unmount} = render(createElement(Demo, {label: 'a'}));
    const surface = getByTestId('surface');
    expect(surface.style.touchAction).toBe('manipulation');

    rerender(createElement(Demo, {label: 'b'}));
    expect(seenRefs.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seenRefs).size).toBe(1);

    act(() => {
      surface.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
      surface.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    unmount();
    expect(surface.style.touchAction || '').toBe('');
    surface.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    surface.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('auto-wires descriptors, never cancels active pans on mid-drag setState, and preserves explicit relationships', () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const onDoubleTap = vi.fn();
    const seenSteps: Array<{step: number; deltaX: number}> = [];

    function Draggable({direction}: {direction: 'horizontal' | 'vertical'}) {
      const [step, setStep] = useState(0);
      const hold = longPress({duration: 500, slop: 4, onLongPress: () => {}});
      const ref = useGestures<HTMLDivElement>([
        tap({onTap: () => {}}),
        doubleTap({onTap: onDoubleTap}),
        hold,
        pan({
          direction,
          slop: 4,
          onPan: ev => {
            seenSteps.push({step, deltaX: ev.deltaX});
            setStep(s => s + 1);
          },
          onPanEnd,
          onPanCancel,
        }).requireFailureOf(hold),
      ]);
      return createElement('div', {ref, 'data-testid': 'drag', 'data-step': String(step)});
    }

    const {getByTestId, rerender} = render(createElement(Draggable, {direction: 'horizontal'}));
    const drag = getByTestId('drag');
    expect(drag.style.touchAction).toBe('pan-y pinch-zoom');

    act(() => {
      drag.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    });
    act(() => {
      document.dispatchEvent(pointerEvent('pointermove', {clientX: 24, clientY: 0, timeStamp: 16}));
    });
    act(() => {
      document.dispatchEvent(pointerEvent('pointermove', {clientX: 44, clientY: 0, timeStamp: 32}));
    });
    act(() => {
      document.dispatchEvent(pointerEvent('pointerup', {clientX: 44, clientY: 0, timeStamp: 48}));
    });

    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(seenSteps).toEqual([
      {step: 0, deltaX: 20},
      {step: 1, deltaX: 40},
    ]);
    expect(drag.dataset.step).toBe('2');

    rerender(createElement(Draggable, {direction: 'vertical'}));
    expect(drag.style.touchAction).toBe('pan-x pinch-zoom');

    act(() => {
      drag.dispatchEvent(pointerEvent('pointerdown', {pointerId: 2, clientX: 5, timeStamp: 200}));
      drag.dispatchEvent(pointerEvent('pointerup', {pointerId: 2, clientX: 5, timeStamp: 220}));
      drag.dispatchEvent(pointerEvent('pointerdown', {pointerId: 3, clientX: 5, timeStamp: 280}));
      drag.dispatchEvent(pointerEvent('pointerup', {pointerId: 3, clientX: 5, timeStamp: 300}));
    });
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('attaches and detaches across conditional rendering and supports SVGElement targets', () => {
    const onTap = vi.fn();

    function ConditionalSvg({show}: {show: boolean}) {
      const ref = useGestures<SVGSVGElement>([tap({onTap})]);
      return show ? createElement('svg', {ref, 'data-testid': 'svg-target'}) : null;
    }

    const {queryByTestId, getByTestId, rerender} = render(
      createElement(ConditionalSvg, {show: false})
    );
    expect(queryByTestId('svg-target')).toBeNull();

    rerender(createElement(ConditionalSvg, {show: true}));
    const svg = getByTestId('svg-target');
    expect(svg.style.touchAction).toBe('manipulation');

    act(() => {
      svg.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
      svg.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    rerender(createElement(ConditionalSvg, {show: false}));
    expect(queryByTestId('svg-target')).toBeNull();
  });

  it('is resilient to React.StrictMode double-invocation without duplicating listeners', () => {
    const onTap = vi.fn();

    function StrictDemo() {
      const ref = useGestures<HTMLDivElement>([tap({onTap})]);
      return createElement('div', {ref, 'data-testid': 'strict'});
    }

    const {getByTestId} = render(createElement(StrictMode, null, createElement(StrictDemo)));
    const el = getByTestId('strict');

    act(() => {
      el.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
      el.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('supports custom ignoreTarget predicates and toggling between ignoreTarget: true and a function', () => {
    const onTap = vi.fn();

    function FilterDemo({ignoreTarget}: {ignoreTarget: GesturesOptions['ignoreTarget']}) {
      const ref = useGestures<HTMLDivElement>([tap({onTap})], {ignoreTarget});
      return createElement(
        'div',
        {ref, 'data-testid': 'surface'},
        createElement('input', {'data-testid': 'inp'}),
        createElement('span', {'data-testid': 'blocked', 'data-ignore': '1'})
      );
    }

    const {getByTestId, rerender} = render(createElement(FilterDemo, {ignoreTarget: true}));
    const inp = getByTestId('inp');
    const blocked = getByTestId('blocked');

    const doTap = (el: HTMLElement, t: number) => {
      act(() => {
        el.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
        el.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
      });
    };

    doTap(inp, 0);
    doTap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    rerender(
      createElement(FilterDemo, {
        ignoreTarget: target =>
          target instanceof Element && Boolean(target.closest('[data-ignore]')),
      })
    );
    doTap(blocked, 100);
    doTap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    rerender(createElement(FilterDemo, {ignoreTarget: true}));
    doTap(inp, 200);
    doTap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);
  });
});
