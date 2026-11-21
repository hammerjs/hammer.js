import {pan, tap} from '@hammerjs/core';
import {createRoot, createSignal} from 'solid-js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createGestures, gestures} from '../src/index.js';

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

describe('@hammerjs/solid', () => {
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

  it('createGestures attaches reactively and cleans up when the owner disposes', () => {
    const el = mount(document.createElement('div'));
    const onTap = vi.fn();

    const dispose = createRoot(d => {
      createGestures(el, [tap({onTap})]);
      return d;
    });

    expect(el.style.touchAction).toBe('manipulation');
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    expect(onTap).toHaveBeenCalledTimes(1);

    dispose();
    expect(el.style.touchAction || '').toBe('');
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('never cancels an active pan when signals update mid-drag and always reads latest signal', () => {
    const el = mount(document.createElement('div'));
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seen: Array<{step: number; deltaX: number}> = [];

    const dispose = createRoot(d => {
      const [step, setStep] = createSignal(0);
      createGestures(el, () => {
        const current = step();
        return [
          pan({
            slop: 4,
            onPan: ev => {
              seen.push({step: current, deltaX: ev.deltaX});
              setStep(s => s + 1);
            },
            onPanEnd,
            onPanCancel,
          }),
        ];
      });
      return d;
    });

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
    dispose();
  });

  it('supports gestures directive, reactive options, and SVGElement targets', () => {
    const svg = mount(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    const onTap = vi.fn();

    let setDirection!: (d: 'horizontal' | 'vertical') => void;

    const dispose = createRoot(d => {
      const [direction, _setDirection] = createSignal<'horizontal' | 'vertical'>('horizontal');
      setDirection = _setDirection;

      gestures(svg, () => ({
        gestures: [tap({onTap}), pan({direction: direction(), onPan: () => {}})],
      }));
      return d;
    });

    expect(svg.style.touchAction).toBe('pan-y pinch-zoom');

    setDirection('vertical');
    expect(svg.style.touchAction).toBe('pan-x pinch-zoom');

    svg.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
    svg.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    expect(onTap).toHaveBeenCalledTimes(1);

    dispose();
    expect(svg.style.touchAction || '').toBe('');
  });

  it('preserves ignoreTarget predicate return values and handles true <-> fn transitions', () => {
    const el = mount(document.createElement('div'));
    const inp = document.createElement('input');
    const blocked = document.createElement('span');
    blocked.dataset.ignore = '1';
    el.append(inp, blocked);

    const onTap = vi.fn();
    let setIgnore!: (value: boolean | ((target: EventTarget) => boolean)) => void;

    const dispose = createRoot(d => {
      const [ignoreTarget, _setIgnore] = createSignal<boolean | ((target: EventTarget) => boolean)>(
        true
      );
      setIgnore = _setIgnore;
      createGestures(el, [tap({onTap})], () => ({ignoreTarget: ignoreTarget()}));
      return d;
    });

    const doTap = (target: HTMLElement, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };

    doTap(inp, 0);
    doTap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    setIgnore(
      () => (target: EventTarget) =>
        target instanceof Element && Boolean(target.closest('[data-ignore]'))
    );
    doTap(blocked, 100);
    doTap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    setIgnore(true);
    doTap(inp, 200);
    doTap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);

    dispose();
  });
});
