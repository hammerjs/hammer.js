import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';
import {computed, toValue, watch, type MaybeRefOrGetter, type ObjectDirective} from 'vue';

export type {GestureTarget, HammerOptions};

export interface UseHammerOptions extends HammerOptions {
  /**
   * Enables or disables gesture recognition reactively.
   * @default true
   */
  enabled?: boolean;
}

function serializeConfig(options: HammerOptions): string {
  return JSON.stringify(
    Object.entries(options)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => [key, typeof value === 'function' ? true : value])
  );
}

function wrapCallbacks(optionsRef: {current: HammerOptions}): HammerOptions {
  const wrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(optionsRef.current)) {
    if (typeof value === 'function') {
      wrapped[key] = (...args: unknown[]) => {
        const fn = (optionsRef.current as Record<string, unknown>)[key];
        if (typeof fn === 'function') {
          fn(...args);
        }
      };
    } else if (value !== undefined) {
      wrapped[key] = value;
    }
  }
  return wrapped as HammerOptions;
}

/**
 * Vue 3 composable that attaches a {@link Hammer} instance to a template ref or getter
 * and cleans it up automatically on unmount or scope disposal.
 *
 * Inline callbacks can be returned from a reactive options getter without tearing down
 * active gestures when Vue re-evaluates the getter.
 */
export function useHammer<T extends GestureTarget = HTMLElement>(
  target: MaybeRefOrGetter<T | null | undefined>,
  options: MaybeRefOrGetter<UseHammerOptions> = {}
): void {
  const optionsRef: {current: HammerOptions} = {current: {}};

  const structural = computed(() => {
    const {enabled = true, ...hammerOptions} = toValue(options);
    optionsRef.current = hammerOptions;
    return `${enabled}|${serializeConfig(hammerOptions)}`;
  });

  watch(
    [() => toValue(target), structural],
    ([element], _prev, onCleanup) => {
      const enabled = toValue(options).enabled ?? true;
      if (!element || !enabled || typeof window === 'undefined') {
        return;
      }
      const hammer = new Hammer(element, wrapCallbacks(optionsRef));
      onCleanup(() => hammer.destroy());
    },
    {immediate: true, flush: 'sync'}
  );
}

interface DirectiveState {
  hammer: Hammer | null;
  optionsRef: {current: HammerOptions};
  configKey: string | null;
}

const directiveStates = new WeakMap<GestureTarget, DirectiveState>();

function syncDirective(el: GestureTarget, value: UseHammerOptions = {}): void {
  if (typeof window === 'undefined') {
    return;
  }
  const {enabled = true, ...hammerOptions} = value;
  const nextKey = enabled ? serializeConfig(hammerOptions) : null;

  let state = directiveStates.get(el);
  if (!state) {
    state = {hammer: null, optionsRef: {current: hammerOptions}, configKey: null};
    directiveStates.set(el, state);
  }
  state.optionsRef.current = hammerOptions;

  if (state.configKey === nextKey) {
    return;
  }

  state.hammer?.destroy();
  state.hammer = nextKey !== null ? new Hammer(el, wrapCallbacks(state.optionsRef)) : null;
  state.configKey = nextKey;
}

/**
 * Vue 3 directive (`v-hammer`) that attaches {@link Hammer} directly in templates:
 * `<div v-hammer="{ onTap, onPan }" />`.
 */
export const vHammer: ObjectDirective<GestureTarget, UseHammerOptions | undefined> = {
  mounted(el, binding) {
    syncDirective(el, binding.value);
  },
  updated(el, binding) {
    syncDirective(el, binding.value);
  },
  unmounted(el) {
    const state = directiveStates.get(el);
    state?.hammer?.destroy();
    directiveStates.delete(el);
  },
};
