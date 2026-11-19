import {act, cleanup, render} from '@testing-library/react';
import {StrictMode, createElement, useState, type RefCallback} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useHammer, type UseHammerOptions} from '../src/index.js';

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

describe('@hammerjs/react useHammer', () => {
  afterEach(cleanup);

  it('attaches via callback ref, handles gestures, keeps stable ref identity, and cleans up on unmount', () => {
    const onTap = vi.fn();
    const seenRefs: Array<RefCallback<HTMLDivElement>> = [];

    function Demo({label}: {label: string}) {
      const ref = useHammer<HTMLDivElement>({onTap});
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

  it('never cancels an active pan when inline callbacks trigger setState and always reads latest state', () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seenSteps: Array<{step: number; deltaX: number}> = [];

    function Draggable() {
      const [step, setStep] = useState(0);
      const ref = useHammer<HTMLDivElement>({
        pan: {slop: 4},
        onPan: ev => {
          seenSteps.push({step, deltaX: ev.deltaX});
          setStep(s => s + 1);
        },
        onPanEnd,
        onPanCancel,
      });
      return createElement('div', {ref, 'data-testid': 'drag', 'data-step': String(step)});
    }

    const {getByTestId} = render(createElement(Draggable));
    const drag = getByTestId('drag');

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
  });

  it('attaches and detaches across conditional rendering', () => {
    const onTap = vi.fn();

    function Conditional({show}: {show: boolean}) {
      const ref = useHammer<HTMLDivElement>({onTap});
      return show ? createElement('div', {ref, 'data-testid': 'cond'}) : null;
    }

    const {queryByTestId, getByTestId, rerender} = render(
      createElement(Conditional, {show: false})
    );
    expect(queryByTestId('cond')).toBeNull();

    rerender(createElement(Conditional, {show: true}));
    const el = getByTestId('cond');
    expect(el.style.touchAction).toBe('manipulation');

    act(() => {
      el.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
      el.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    rerender(createElement(Conditional, {show: false}));
    expect(queryByTestId('cond')).toBeNull();
  });

  it('supports toggling enabled without breaking the Rules of Hooks', () => {
    const onTap = vi.fn();

    function Toggleable({enabled}: {enabled: boolean}) {
      const ref = useHammer<HTMLDivElement>({enabled, onTap});
      return createElement('div', {ref, 'data-testid': 'toggle'});
    }

    const {getByTestId, rerender} = render(createElement(Toggleable, {enabled: false}));
    const el = getByTestId('toggle');
    expect(el.style.touchAction || '').toBe('');

    act(() => {
      el.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
      el.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    });
    expect(onTap).not.toHaveBeenCalled();

    rerender(createElement(Toggleable, {enabled: true}));
    expect(el.style.touchAction).toBe('manipulation');
    act(() => {
      el.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 100}));
      el.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 120}));
    });
    expect(onTap).toHaveBeenCalledTimes(1);

    rerender(createElement(Toggleable, {enabled: false}));
    expect(el.style.touchAction || '').toBe('');
  });

  it('updates Hammer options when structural config or enabled callbacks change', () => {
    function Configurable({options}: {options: UseHammerOptions}) {
      const ref = useHammer<HTMLDivElement>(options);
      return createElement('div', {ref, 'data-testid': 'cfg'});
    }

    const {getByTestId, rerender} = render(
      createElement(Configurable, {
        options: {onPan: () => {}, pan: {direction: 'horizontal'}},
      })
    );
    const el = getByTestId('cfg');
    expect(el.style.touchAction).toBe('pan-y pinch-zoom');

    rerender(
      createElement(Configurable, {
        options: {onPan: () => {}, pan: {direction: 'vertical'}},
      })
    );
    expect(el.style.touchAction).toBe('pan-x pinch-zoom');

    rerender(createElement(Configurable, {options: {onTap: () => {}}}));
    expect(el.style.touchAction).toBe('manipulation');
  });

  it('supports SVGElement targets across conditional rendering', () => {
    const onTap = vi.fn();

    function SvgTarget({show}: {show: boolean}) {
      const ref = useHammer<SVGSVGElement>({onTap});
      return show ? createElement('svg', {ref, 'data-testid': 'svg-target'}) : null;
    }

    const {getByTestId, rerender} = render(createElement(SvgTarget, {show: false}));
    rerender(createElement(SvgTarget, {show: true}));

    const svg = getByTestId('svg-target');
    expect(svg.style.touchAction).toBe('manipulation');

    act(() => {
      svg.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
      svg.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('is resilient to React.StrictMode double-invocation without duplicating listeners', () => {
    const onTap = vi.fn();

    function StrictDemo() {
      const ref = useHammer<HTMLDivElement>({onTap});
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
});
