import {
  GestureBinding,
  type GestureDescriptor,
  type GesturesOptions,
  type GestureTargetElement,
} from '@hammerjs/core';
import {toValue, watch, type MaybeRefOrGetter, type ObjectDirective} from 'vue';

export type {GestureDescriptor, GesturesOptions, GestureTargetElement};

export type GesturesDirectiveValue =
  | readonly GestureDescriptor[]
  | ({readonly gestures: readonly GestureDescriptor[]} & GesturesOptions);

function normalizeGesturesValue(value: GesturesDirectiveValue | undefined): {
  gestures: readonly GestureDescriptor[];
  options: GesturesOptions;
} {
  if (!value) {
    return {gestures: [], options: {}};
  }
  if (Array.isArray(value)) {
    return {gestures: value, options: {}};
  }
  const {gestures, ...options} = value as {
    readonly gestures: readonly GestureDescriptor[];
  } & GesturesOptions;
  return {gestures, options};
}

/**
 * Tree-shakable Vue 3 composable that binds {@link GestureDescriptor}s (`tap`, `pan`, ...)
 * to a template ref or getter without importing unused recognizers.
 *
 * Inline callbacks returned from reactive getters never tear down active gestures when
 * Vue re-evaluates the getter.
 */
export function useGestures<T extends GestureTargetElement = HTMLElement>(
  target: MaybeRefOrGetter<T | null | undefined>,
  gestures: MaybeRefOrGetter<readonly GestureDescriptor[]>,
  options: MaybeRefOrGetter<GesturesOptions> = {}
): void {
  let binding: GestureBinding<T> | null = null;
  let latestGestures: readonly GestureDescriptor[] = [];
  let latestOptions: GesturesOptions = {};

  watch(
    () => [toValue(gestures), toValue(options)] as const,
    ([nextGestures, nextOptions]) => {
      latestGestures = nextGestures;
      latestOptions = nextOptions;
      binding?.update(nextGestures, nextOptions);
    },
    {immediate: true, flush: 'sync', deep: true}
  );

  watch(
    () => toValue(target),
    (element, _prev, onCleanup) => {
      if (!element || typeof window === 'undefined') {
        return;
      }
      const instance = new GestureBinding(element, latestGestures, latestOptions);
      binding = instance;
      onCleanup(() => {
        instance.destroy();
        if (binding === instance) {
          binding = null;
        }
      });
    },
    {immediate: true, flush: 'sync'}
  );
}

const gestureBindings = new WeakMap<GestureTargetElement, GestureBinding>();

function syncGesturesDirective(
  el: GestureTargetElement,
  value: GesturesDirectiveValue | undefined
): void {
  if (typeof window === 'undefined') {
    return;
  }
  const {gestures, options} = normalizeGesturesValue(value);
  const existing = gestureBindings.get(el);
  if (existing) {
    existing.update(gestures, options);
  } else {
    gestureBindings.set(el, new GestureBinding(el, gestures, options));
  }
}

/**
 * Tree-shakable Vue 3 directive (`v-gestures`) that binds {@link GestureDescriptor}s directly
 * in templates: `<div v-gestures="[tap({ onTap }), pan({ onPan })]" />`.
 */
export const vGestures: ObjectDirective<GestureTargetElement, GesturesDirectiveValue | undefined> =
  {
    mounted(el, binding) {
      syncGesturesDirective(el, binding.value);
    },
    updated(el, binding) {
      syncGesturesDirective(el, binding.value);
    },
    unmounted(el) {
      gestureBindings.get(el)?.destroy();
      gestureBindings.delete(el);
    },
  };
