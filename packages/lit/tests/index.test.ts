import {pan, tap} from '@hammerjs/core';
import {LitElement, html} from 'lit';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {GesturesController} from '../src/index.js';

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

let tagSeq = 0;
function uniqueTag(prefix: string): string {
  return `${prefix}-${++tagSeq}`;
}

describe('@hammerjs/lit GesturesController', () => {
  const mounted: HTMLElement[] = [];

  afterEach(() => {
    while (mounted.length > 0) {
      mounted.pop()!.remove();
    }
  });

  it('attaches to the host element on connect and cleans up on disconnect', async () => {
    const onTap = vi.fn();

    class HostTapEl extends LitElement {
      readonly gestures = new GesturesController(this, [tap({onTap})]);
      override render() {
        return html`<span>tap</span>`;
      }
    }

    const tag = uniqueTag('gestures-host-tap');
    customElements.define(tag, HostTapEl);
    const el = document.createElement(tag) as HostTapEl;
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;

    expect(el.gestures.instance).not.toBeNull();
    expect(el.style.touchAction).toBe('manipulation');

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    expect(onTap).toHaveBeenCalledTimes(1);

    el.remove();
    expect(el.gestures.instance).toBeNull();
    expect(el.style.touchAction || '').toBe('');
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('never cancels an active pan when setGestures replaces inline callbacks mid-drag', async () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seen: Array<{step: number; deltaX: number}> = [];

    class DragEl extends LitElement {
      step = 0;
      readonly gestures = new GesturesController(this, [
        pan({
          slop: 4,
          onPan: ev => {
            seen.push({step: this.step, deltaX: ev.deltaX});
            this.step++;
            this.gestures.setGestures([
              pan({
                slop: 4,
                onPan: nextEv => {
                  seen.push({step: this.step, deltaX: nextEv.deltaX});
                  this.step++;
                },
                onPanEnd,
                onPanCancel,
              }),
            ]);
          },
          onPanEnd,
          onPanCancel,
        }),
      ]);
    }

    const tag = uniqueTag('gestures-drag');
    customElements.define(tag, DragEl);
    const el = document.createElement(tag) as DragEl;
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;

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
  });

  it('supports structural config updates and shadow-DOM child targets', async () => {
    const onTap = vi.fn();

    class ShadowSurfaceEl extends LitElement {
      readonly gestures = new GesturesController(
        this,
        [tap({onTap}), pan({direction: 'horizontal', onPan: () => {}})],
        {},
        () => this.renderRoot.querySelector<HTMLDivElement>('.surface')
      );

      override render() {
        return html`<div class="surface"></div>`;
      }
    }

    const tag = uniqueTag('gestures-shadow');
    customElements.define(tag, ShadowSurfaceEl);
    const el = document.createElement(tag) as ShadowSurfaceEl;
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;

    const surface = el.renderRoot.querySelector<HTMLDivElement>('.surface')!;
    expect(surface.style.touchAction).toBe('pan-y pinch-zoom');

    surface.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
    surface.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    expect(onTap).toHaveBeenCalledTimes(1);

    el.gestures.setGestures([tap({onTap}), pan({direction: 'vertical', onPan: () => {}})]);
    expect(surface.style.touchAction).toBe('pan-x pinch-zoom');
  });

  it('preserves ignoreTarget predicate return values and handles true <-> fn transitions', async () => {
    const onTap = vi.fn();

    class FilterEl extends LitElement {
      readonly gestures = new GesturesController(this, [tap({onTap})], {ignoreTarget: true});
      override render() {
        return html`<input class="inp" /><span class="blocked" data-ignore="1"></span>`;
      }
    }

    const tag = uniqueTag('gestures-filter');
    customElements.define(tag, FilterEl);
    const el = document.createElement(tag) as FilterEl;
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;

    const inp = el.renderRoot.querySelector<HTMLInputElement>('.inp')!;
    const blocked = el.renderRoot.querySelector<HTMLSpanElement>('.blocked')!;

    const doTap = (target: HTMLElement, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };

    doTap(inp, 0);
    doTap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    el.gestures.setGestures([tap({onTap})], {
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    doTap(blocked, 100);
    doTap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    el.gestures.setGestures([tap({onTap})], {ignoreTarget: true});
    doTap(inp, 200);
    doTap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);
  });
});
