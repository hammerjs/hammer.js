import '@angular/compiler';
import {ElementRef, NgZone, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {BrowserTestingModule, platformBrowserTesting} from '@angular/platform-browser/testing';
import {pan, tap} from '@hammerjs/core';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {GesturesDirective, type GestureDescriptor, type GesturesOptions} from '../src/index.js';

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

describe('@hammerjs/angular GesturesDirective', () => {
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
    initialGestures: readonly GestureDescriptor[] = [],
    initialOptions: GesturesOptions = {}
  ) {
    document.body.appendChild(element);
    elements.push(element);

    TestBed.configureTestingModule({
      providers: [{provide: ElementRef, useValue: new ElementRef(element)}],
    });

    const gesturesSig = signal<readonly GestureDescriptor[]>(initialGestures);
    const optionsSig = signal<GesturesOptions>(initialOptions);

    const directive = TestBed.runInInjectionContext(() => {
      const dir = new GesturesDirective<T>();
      Object.defineProperty(dir, 'gestures', {value: gesturesSig});
      Object.defineProperty(dir, 'gesturesOptions', {value: optionsSig});
      return dir;
    });
    TestBed.tick();

    return {
      directive,
      element,
      setGestures: (next: readonly GestureDescriptor[]) => {
        gesturesSig.set(next);
        TestBed.tick();
      },
      setOptions: (next: GesturesOptions) => {
        optionsSig.set(next);
        TestBed.tick();
      },
    };
  }

  it('attaches descriptors, preserves touch-action, and cleans up on destroy', () => {
    const onTap = vi.fn();
    const el = document.createElement('div');
    const {directive} = setup(el, [tap({onTap})]);

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

  it('attaches DOM listeners outside NgZone, re-enters only on emit, and survives mid-drag updates', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    elements.push(el);

    TestBed.configureTestingModule({
      providers: [{provide: ElementRef, useValue: new ElementRef(el)}],
    });
    const ngZone = TestBed.inject(NgZone);
    const runOutsideSpy = vi.spyOn(ngZone, 'runOutsideAngular');
    const runSpy = vi.spyOn(ngZone, 'run');

    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seen: Array<{step: number; deltaX: number}> = [];
    let step = 0;

    const gesturesSig = signal<readonly GestureDescriptor[]>([]);
    const optionsSig = signal<GesturesOptions>({});

    const makeList = (direction: 'horizontal' | 'vertical' = 'horizontal') => {
      const current = step;
      return [
        pan({
          direction,
          slop: 10,
          onPan: ev => {
            seen.push({step: current, deltaX: ev.deltaX});
            step++;
            gesturesSig.set(makeList(direction));
            TestBed.tick();
          },
          onPanEnd,
          onPanCancel,
        }),
      ];
    };

    gesturesSig.set(makeList('horizontal'));

    const directive = TestBed.runInInjectionContext(() => {
      const dir = new GesturesDirective();
      Object.defineProperty(dir, 'gestures', {value: gesturesSig});
      Object.defineProperty(dir, 'gesturesOptions', {value: optionsSig});
      return dir;
    });
    TestBed.tick();

    expect(directive.instance).not.toBeNull();
    expect(el.style.touchAction).toBe('pan-y pinch-zoom');
    expect(runOutsideSpy).toHaveBeenCalled();
    runSpy.mockClear();

    // Movement within slop stays outside NgZone:
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 4, clientY: 0, timeStamp: 16}));
    expect(runSpy).not.toHaveBeenCalled();

    // Exceeding slop fires inside NgZone and mid-drag array updates never cancel pan:
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 25, clientY: 0, timeStamp: 32}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 45, clientY: 0, timeStamp: 48}));
    document.dispatchEvent(pointerEvent('pointerup', {clientX: 45, clientY: 0, timeStamp: 64}));

    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      {step: 0, deltaX: 15},
      {step: 1, deltaX: 35},
    ]);
    expect(runSpy).toHaveBeenCalled();

    gesturesSig.set(makeList('vertical'));
    TestBed.tick();
    expect(el.style.touchAction).toBe('pan-x pinch-zoom');
  });

  it('supports SVGElement host targets and ignoreTarget true <-> fn transitions', () => {
    const onTap = vi.fn();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const inp = document.createElement('input');
    const blocked = document.createElement('span');
    blocked.dataset.ignore = '1';
    svg.append(inp, blocked);

    const {setOptions} = setup(svg, [tap({onTap})], {ignoreTarget: true});
    expect(svg.style.touchAction).toBe('manipulation');

    const doTap = (target: Element, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };

    doTap(inp, 0);
    doTap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    setOptions({
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    doTap(blocked, 100);
    doTap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    setOptions({ignoreTarget: true});
    doTap(inp, 200);
    doTap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);
  });
});
