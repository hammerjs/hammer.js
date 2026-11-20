import {Hammer, type GestureTargetElement, type HammerOptions} from '@hammerjs/core';
import {ref, toValue, watch, type MaybeRefOrGetter, type ObjectDirective} from 'vue';

export type {GestureTargetElement, HammerOptions};

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'function') {
    return '[fn]';
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, normalizeValue(v)]);
  }
  return value;
}

function serializeConfig(options: HammerOptions): string {
  return JSON.stringify(normalizeValue(options));
}

function wrapCallbacks(optionsRef: {current: HammerOptions}): HammerOptions {
  const wrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(optionsRef.current)) {
    if (typeof value === 'function') {
      wrapped[key] = (...args: unknown[]) => {
        const fn = (optionsRef.current as Record<string, unknown>)[key];
        if (typeof fn === 'function') {
          return fn(...args);
        }
        return undefined;
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
export function useHammer<T extends GestureTargetElement = HTMLElement>(
  target: MaybeRefOrGetter<T | null | undefined>,
  options: MaybeRefOrGetter<HammerOptions> = {}
): void {
  const optionsRef: {current: HammerOptions} = {current: {}};
  const structuralKey = ref('');

  watch(
    () => toValue(options),
    next => {
      optionsRef.current = next;
      structuralKey.value = serializeConfig(next);
    },
    {immediate: true, flush: 'sync', deep: true}
  );

  watch(
    [() => toValue(target), structuralKey],
    ([element], _prev, onCleanup) => {
      if (!element || typeof window === 'undefined') {
        return;
      }
      const hammer = new Hammer(element, wrapCallbacks(optionsRef));
      onCleanup(() => {
        hammer.destroy();
      });
    },
    {immediate: true, flush: 'sync'}
  );
}

interface DirectiveState {
  hammer: Hammer | null;
  optionsRef: {current: HammerOptions};
  configKey: string | null;
}

const directiveStates = new WeakMap<GestureTargetElement, DirectiveState>();

function syncDirective(el: GestureTargetElement, value: HammerOptions = {}): void {
  if (typeof window === 'undefined') {
    return;
  }
  const nextKey = serializeConfig(value);

  let state = directiveStates.get(el);
  if (!state) {
    state = {hammer: null, optionsRef: {current: value}, configKey: null};
    directiveStates.set(el, state);
  }
  state.optionsRef.current = value;

  if (state.configKey === nextKey) {
    return;
  }

  state.hammer?.destroy();
  state.hammer = new Hammer(el, wrapCallbacks(state.optionsRef));
  state.configKey = nextKey;
}

/**
 * Vue 3 directive (`v-hammer`) that attaches {@link Hammer} directly in templates:
 * `<div v-hammer="{ onTap, onPan }" />`.
 */
export const vHammer: ObjectDirective<GestureTargetElement, HammerOptions | undefined> = {
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
