import {afterEach, describe, expect, it, vi} from 'vitest';
import {hammer} from '../src/index.js';

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

describe('@hammerjs/svelte hammer action', () => {
  const elements: Array<HTMLElement | SVGElement> = [];

  afterEach(() => {
    while (elements.length > 0) {
      elements.pop()!.remove();
    }
  });

  function mount<T extends HTMLElement | SVGElement>(el: T): T {
    document.body.appendChild(el);
    elements.push(el);
    return el;
  }

  it('attaches on mount, dispatches gestures, and cleans up on destroy', () => {
    const el = mount(document.createElement('div'));
    const onTap = vi.fn();

    const action = hammer(el, {onTap});
    expect(el.style.touchAction).toBe('manipulation');

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    expect(onTap).toHaveBeenCalledTimes(1);

    action.destroy?.();
    expect(el.style.touchAction || '').toBe('');
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('never cancels an active pan when update() replaces inline closures mid-drag', () => {
    const el = mount(document.createElement('div'));
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seen: Array<{step: number; deltaX: number}> = [];
    let step = 0;

    const makeOptions = () => {
      const current = step;
      return {
        pan: {slop: 4},
        onPan: (ev: {deltaX: number}) => {
          seen.push({step: current, deltaX: ev.deltaX});
          step++;
          action.update?.(makeOptions());
        },
        onPanEnd,
        onPanCancel,
      };
    };

    const action = hammer(el, makeOptions());

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 24, clientY: 0, timeStamp: 16}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 44, clientY: 0, timeStamp: 32}));
    document.dispatchEvent(pointerEvent('pointerup', {clientX: 44, clientY: 0, timeStamp: 48}));

    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      {step: 0, deltaX: 20},
      {step: 1, deltaX: 40},
    ]);
    action.destroy?.();
  });

  it('supports structural option updates and SVGElement targets', () => {
    const svg = mount(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    const onTap = vi.fn();

    const action = hammer(svg, {onTap, onPan: () => {}, pan: {direction: 'horizontal'}});
    expect(svg.style.touchAction).toBe('pan-y pinch-zoom');

    action.update?.({onTap, onPan: () => {}, pan: {direction: 'vertical'}});
    expect(svg.style.touchAction).toBe('pan-x pinch-zoom');

    svg.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
    svg.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    expect(onTap).toHaveBeenCalledTimes(1);

    action.destroy?.();
    expect(svg.style.touchAction || '').toBe('');
  });

  it('preserves ignoreTarget predicate return values and handles true <-> fn transitions', () => {
    const el = mount(document.createElement('div'));
    const inp = document.createElement('input');
    const blocked = document.createElement('span');
    blocked.dataset.ignore = '1';
    el.append(inp, blocked);

    const onTap = vi.fn();
    const action = hammer(el, {onTap, ignoreTarget: true});

    const tap = (target: HTMLElement, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };

    tap(inp, 0);
    tap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    action.update?.({
      onTap,
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    tap(blocked, 100);
    tap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    action.update?.({onTap, ignoreTarget: true});
    tap(inp, 200);
    tap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);

    action.destroy?.();
  });
});
