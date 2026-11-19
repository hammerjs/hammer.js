import {cleanup, render} from '@testing-library/vue';
import {defineComponent, h, nextTick, ref, withDirectives} from 'vue';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useHammer, vHammer, type HammerOptions} from '../src/index.js';

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

describe('@hammerjs/vue', () => {
  afterEach(cleanup);

  it('useHammer attaches to a template ref, handles gestures, and cleans up on unmount', () => {
    const onTap = vi.fn();

    const Demo = defineComponent({
      setup() {
        const el = ref<HTMLDivElement | null>(null);
        useHammer(el, {onTap});
        return () => h('div', {ref: el, 'data-testid': 'surface'});
      },
    });

    const {getByTestId, unmount} = render(Demo);
    const surface = getByTestId('surface');
    expect(surface.style.touchAction).toBe('manipulation');

    surface.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 0}));
    surface.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 30}));
    expect(onTap).toHaveBeenCalledTimes(1);

    unmount();
    expect(surface.style.touchAction || '').toBe('');
    surface.dispatchEvent(pointerEvent('pointerdown', {clientX: 10, clientY: 10, timeStamp: 100}));
    surface.dispatchEvent(pointerEvent('pointerup', {clientX: 10, clientY: 10, timeStamp: 130}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('useHammer never cancels an active pan when reactive state updates mid-drag', async () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const getterCalls = vi.fn();
    const seenSteps: Array<{step: number; deltaX: number}> = [];

    const Draggable = defineComponent({
      setup() {
        const el = ref<HTMLDivElement | null>(null);
        const step = ref(0);
        useHammer(el, () => {
          getterCalls();
          const current = step.value;
          return {
            pan: {slop: 4},
            onPan: ev => {
              seenSteps.push({step: current, deltaX: ev.deltaX});
              step.value++;
            },
            onPanEnd,
            onPanCancel,
          };
        });
        return () => h('div', {ref: el, 'data-testid': 'drag', 'data-step': String(step.value)});
      },
    });

    const {getByTestId} = render(Draggable);
    const drag = getByTestId('drag');
    expect(getterCalls).toHaveBeenCalledTimes(1);

    drag.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 24, clientY: 0, timeStamp: 16}));
    await nextTick();
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 44, clientY: 0, timeStamp: 32}));
    await nextTick();
    document.dispatchEvent(pointerEvent('pointerup', {clientX: 44, clientY: 0, timeStamp: 48}));

    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(seenSteps).toEqual([
      {step: 0, deltaX: 20},
      {step: 1, deltaX: 40},
    ]);
    expect(drag.dataset.step).toBe('2');
  });

  it('useHammer supports reactive option updates and SVGElement targets', async () => {
    const onTap = vi.fn();
    const direction = ref<'horizontal' | 'vertical'>('horizontal');

    const Demo = defineComponent({
      setup() {
        const svg = ref<SVGSVGElement | null>(null);
        useHammer(svg, () => ({
          onTap,
          onPan: () => {},
          pan: {direction: direction.value},
        }));
        return () => h('svg', {ref: svg, 'data-testid': 'svg'});
      },
    });

    const {getByTestId} = render(Demo);
    const svg = getByTestId('svg');
    expect(svg.style.touchAction).toBe('pan-y pinch-zoom');

    direction.value = 'vertical';
    await nextTick();
    expect(svg.style.touchAction).toBe('pan-x pinch-zoom');

    svg.dispatchEvent(pointerEvent('pointerdown', {clientX: 5, clientY: 5, timeStamp: 0}));
    svg.dispatchEvent(pointerEvent('pointerup', {clientX: 5, clientY: 5, timeStamp: 20}));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('vHammer directive attaches, updates without cancelling active pans, and cleans up', async () => {
    const onPanCancel = vi.fn();
    const onPanEnd = vi.fn();
    const deltas: number[] = [];

    const DirectiveDemo = defineComponent({
      setup() {
        const count = ref(0);
        const options = (): HammerOptions => ({
          pan: {slop: 4},
          onPan: ev => {
            deltas.push(ev.deltaX);
            count.value++;
          },
          onPanEnd,
          onPanCancel,
        });
        return () =>
          withDirectives(h('div', {'data-testid': 'dir', 'data-count': String(count.value)}), [
            [vHammer, options()],
          ]);
      },
    });

    const {getByTestId, unmount} = render(DirectiveDemo);
    const el = getByTestId('dir');
    expect(el.style.touchAction).toBe('none');

    el.dispatchEvent(pointerEvent('pointerdown', {clientX: 0, clientY: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 24, clientY: 0, timeStamp: 16}));
    await nextTick();
    document.dispatchEvent(pointerEvent('pointermove', {clientX: 44, clientY: 0, timeStamp: 32}));
    await nextTick();
    document.dispatchEvent(pointerEvent('pointerup', {clientX: 44, clientY: 0, timeStamp: 48}));

    expect(onPanCancel).not.toHaveBeenCalled();
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(deltas).toEqual([20, 40]);

    unmount();
    expect(el.style.touchAction || '').toBe('');
  });
});
