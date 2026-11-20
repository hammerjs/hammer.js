import '@angular/compiler';
import {ElementRef, NgZone, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {BrowserTestingModule, platformBrowserTesting} from '@angular/platform-browser/testing';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {HammerDirective, type HammerDirectiveOptions} from '../src/index.js';

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

describe('@hammerjs/angular HammerDirective', () => {
  const elements: Array<HTMLElement | SVGElement> = [];

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    while (elements.length > 0) {
      elements.pop()!.remove();
    }
  });

  function setup<T extends HTMLElement | SVGElement = HTMLDivElement>(
    element: T,
    opts?: {
      initialOptions?: HammerDirectiveOptions | '';
      subscribe?: (directive: HammerDirective<T>) => void;
    }
  ) {
    document.body.appendChild(element);
    elements.push(element);

    TestBed.configureTestingModule({
      providers: [{provide: ElementRef, useValue: new ElementRef(element)}],
    });

    const hammerSig = signal<HammerDirectiveOptions | ''>(opts?.initialOptions ?? '');

    const directive = TestBed.runInInjectionContext(() => {
      const dir = new HammerDirective<T>();
      Object.defineProperty(dir, 'hammer', {value: hammerSig});
      return dir;
    });

    opts?.subscribe?.(directive);
    TestBed.tick();

    return {
      directive,
      element,
      setOptions: (value: HammerDirectiveOptions | '') => {
        hammerSig.set(value);
        TestBed.tick();
      },
    };
  }

  it('registers only subscribed outputs, preserves touch-action, and cleans up on destroy', () => {
    const onTap = vi.fn();
    const el = document.createElement('div');
    const {directive} = setup(el, {
      subscribe: dir => {
        dir.hammerTap.subscribe(onTap);
      },
    });

    expect(directive.instance).not.toBeNull();
    expect(el.style.touchAction).toBe('manipulation');

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    expect(onTap).toHaveBeenCalledTimes(1);

    TestBed.resetTestingModule();
    expect(directive.instance).toBeNull();
    expect(el.style.touchAction || '').toBe('');
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('attaches DOM listeners outside NgZone and re-enters NgZone only when gestures emit', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    elements.push(el);

    TestBed.configureTestingModule({
      providers: [{provide: ElementRef, useValue: new ElementRef(el)}],
    });
    const ngZone = TestBed.inject(NgZone);
    const runOutsideSpy = vi.spyOn(ngZone, 'runOutsideAngular');
    const runSpy = vi.spyOn(ngZone, 'run');

    const hammerSig = signal<HammerDirectiveOptions | ''>({pan: {slop: 10}});
    const onPan = vi.fn();
    const directive = TestBed.runInInjectionContext(() => {
      const dir = new HammerDirective();
      Object.defineProperty(dir, 'hammer', {value: hammerSig});
      return dir;
    });
    directive.hammerPan.subscribe(onPan);
    TestBed.tick();

    expect(runOutsideSpy.mock.results.some(r => r.value === directive.instance)).toBe(true);
    runSpy.mockClear();

    // Pointer movement within slop should never enter NgZone:
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 4, clientY: 0, timeStamp: 16}));
    expect(runSpy).not.toHaveBeenCalled();
    expect(onPan).not.toHaveBeenCalled();

    // Exceeding slop fires onPan inside NgZone:
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 25, clientY: 0, timeStamp: 32}));
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(onPan).toHaveBeenCalledTimes(1);
  });

  it('works cleanly in zoneless mode', () => {
    const onTap = vi.fn();
    const el = document.createElement('div');
    setup(el, {
      subscribe: dir => {
        dir.hammerTap.subscribe(onTap);
      },
    });

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('reactively updates Hammer when [hammer] options change', () => {
    const onPan = vi.fn();
    const el = document.createElement('div');
    const {setOptions} = setup(el, {
      initialOptions: {pan: {direction: 'horizontal'}},
      subscribe: dir => {
        dir.hammerPan.subscribe(onPan);
      },
    });

    expect(el.style.touchAction).toBe('pan-y pinch-zoom');

    setOptions({pan: {direction: 'vertical'}});
    expect(el.style.touchAction).toBe('pan-x pinch-zoom');
  });

  it('never cancels an active pan when [hammer] receives a new equal object literal mid-drag', () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const deltas: number[] = [];
    const el = document.createElement('div');
    const {setOptions} = setup(el, {
      initialOptions: {pan: {slop: 4}},
      subscribe: dir => {
        dir.hammerPan.subscribe(ev => {
          deltas.push(ev.deltaX);
          setOptions({pan: {slop: 4}});
        });
        dir.hammerPanEnd.subscribe(onPanEnd);
        dir.hammerPanCancel.subscribe(onPanCancel);
      },
    });

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 24, clientY: 0, timeStamp: 16}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 44, clientY: 0, timeStamp: 32}));
    document.dispatchEvent(pointerEvent('pointerup', {clientX: 44, clientY: 0, timeStamp: 48}));

    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(deltas).toEqual([20, 40]);
  });

  it('supports SVGElement host targets', () => {
    const onTap = vi.fn();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    setup(svg, {
      subscribe: dir => {
        dir.hammerTap.subscribe(onTap);
      },
    });

    expect(svg.style.touchAction).toBe('manipulation');
    svg.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
    svg.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('supports ignoreTarget predicates, transitions true <-> fn, and reacts to late programmatic output subscriptions', () => {
    const onTap = vi.fn();
    const el = document.createElement('div');
    const inp = document.createElement('input');
    const blocked = document.createElement('span');
    blocked.dataset.ignore = '1';
    el.append(inp, blocked);

    const {directive, setOptions} = setup(el, {
      initialOptions: {ignoreTarget: true},
    });
    expect(directive.instance).not.toBeNull();

    // Late programmatic subscription after initial render registers the recognizer:
    const sub = directive.hammerTap.subscribe(onTap);
    TestBed.tick();
    expect(el.style.touchAction).toBe('manipulation');

    const tap = (target: HTMLElement, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };

    tap(inp, 0);
    tap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    // Switch `true -> fn`:
    setOptions({
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    tap(blocked, 100);
    tap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    // Switch `fn -> true`:
    setOptions({ignoreTarget: true});
    tap(inp, 200);
    tap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);

    sub.unsubscribe();
    TestBed.tick();
    expect(el.style.touchAction || '').toBe('');
  });
});
