import {LitElement, html} from 'lit';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {HammerController} from '../src/index.js';

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

describe('@hammerjs/lit HammerController', () => {
  const mounted: HTMLElement[] = [];

  afterEach(() => {
    while (mounted.length > 0) {
      mounted.pop()!.remove();
    }
  });

  it('attaches to the host element on connect and cleans up on disconnect', async () => {
    const onTap = vi.fn();

    class HostTapEl extends LitElement {
      readonly hammer = new HammerController(this, {onTap});
      override render() {
        return html`<span>tap</span>`;
      }
    }

    const tag = uniqueTag('hammer-host-tap');
    customElements.define(tag, HostTapEl);
    const el = document.createElement(tag) as HostTapEl;
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;

    expect(el.hammer.instance).not.toBeNull();
    expect(el.style.touchAction).toBe('manipulation');

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    expect(onTap).toHaveBeenCalledTimes(1);

    el.remove();
    expect(el.hammer.instance).toBeNull();
    expect(el.style.touchAction || '').toBe('');
    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    el.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('never cancels an active pan when setOptions replaces inline callbacks mid-drag', async () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const seen: Array<{step: number; deltaX: number}> = [];

    class DragEl extends LitElement {
      step = 0;
      readonly hammer = new HammerController(this, {
        pan: {slop: 4},
        onPan: ev => {
          seen.push({step: this.step, deltaX: ev.deltaX});
          this.step++;
          this.hammer.setOptions({
            pan: {slop: 4},
            onPan: nextEv => {
              seen.push({step: this.step, deltaX: nextEv.deltaX});
              this.step++;
            },
            onPanEnd,
            onPanCancel,
          });
        },
        onPanEnd,
        onPanCancel,
      });
    }

    const tag = uniqueTag('hammer-drag');
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
      readonly hammer = new HammerController(
        this,
        {onTap, onPan: () => {}, pan: {direction: 'horizontal'}},
        () => this.renderRoot.querySelector<HTMLDivElement>('.surface')
      );

      override render() {
        return html`<div class="surface"></div>`;
      }
    }

    const tag = uniqueTag('hammer-shadow');
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

    el.hammer.setOptions({onTap, onPan: () => {}, pan: {direction: 'vertical'}});
    expect(surface.style.touchAction).toBe('pan-x pinch-zoom');
  });

  it('preserves ignoreTarget predicate return values and handles true <-> fn transitions', async () => {
    const onTap = vi.fn();

    class FilterEl extends LitElement {
      readonly hammer = new HammerController(this, {onTap, ignoreTarget: true});
      override render() {
        return html`<input class="inp" /><span class="blocked" data-ignore="1"></span>`;
      }
    }

    const tag = uniqueTag('hammer-filter');
    customElements.define(tag, FilterEl);
    const el = document.createElement(tag) as FilterEl;
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;

    const inp = el.renderRoot.querySelector<HTMLInputElement>('.inp')!;
    const blocked = el.renderRoot.querySelector<HTMLSpanElement>('.blocked')!;

    const tap = (target: HTMLElement, t: number) => {
      target.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: t}));
      target.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: t + 20}));
    };

    tap(inp, 0);
    tap(blocked, 50);
    expect(onTap).toHaveBeenCalledTimes(1);

    el.hammer.setOptions({
      onTap,
      ignoreTarget: target => target instanceof Element && Boolean(target.closest('[data-ignore]')),
    });
    tap(blocked, 100);
    tap(inp, 150);
    expect(onTap).toHaveBeenCalledTimes(2);

    el.hammer.setOptions({onTap, ignoreTarget: true});
    tap(inp, 200);
    tap(blocked, 250);
    expect(onTap).toHaveBeenCalledTimes(3);
  });
});
