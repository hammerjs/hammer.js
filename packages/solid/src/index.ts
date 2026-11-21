import {
  GestureBinding,
  type GestureDescriptor,
  type GesturesOptions,
  type GestureTargetElement,
} from '@hammerjs/core';
import {createEffect, onCleanup, type Accessor} from 'solid-js';

export type {GestureDescriptor, GesturesOptions, GestureTargetElement};

export type GesturesDirectiveValue =
  | readonly GestureDescriptor[]
  | ({readonly gestures: readonly GestureDescriptor[]} & GesturesOptions);

function resolveValue<V>(value: Accessor<V> | V): V {
  return typeof value === 'function' ? (value as Accessor<V>)() : value;
}

function normalizeDirectiveValue(value: GesturesDirectiveValue | undefined): {
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
 * Tree-shakable SolidJS primitive that binds {@link GestureDescriptor}s (`tap`, `pan`, ...)
 * to an element or accessor without importing unused recognizers.
 *
 * Inline callbacks inside reactive descriptor accessors never cancel active gestures when
 * signals update mid-drag.
 */
export function createGestures<T extends GestureTargetElement = HTMLElement>(
  target: Accessor<T | null | undefined> | T | null | undefined,
  gestures: Accessor<readonly GestureDescriptor[]> | readonly GestureDescriptor[],
  options: Accessor<GesturesOptions> | GesturesOptions = {}
): void {
  let binding: GestureBinding<T> | null = null;
  let latestGestures: readonly GestureDescriptor[] = [];
  let latestOptions: GesturesOptions = {};

  createEffect(() => {
    latestGestures = resolveValue(gestures);
    latestOptions = resolveValue(options);
    binding?.update(latestGestures, latestOptions);
  });

  createEffect(() => {
    const element = resolveValue(target);
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
  });
}

/**
 * Tree-shakable SolidJS `use:gestures` directive:
 * `<div use:gestures={[tap({ onTap }), pan({ onPan })]} />`.
 */
export function gestures<T extends GestureTargetElement = HTMLElement>(
  element: T,
  accessor: Accessor<GesturesDirectiveValue | undefined>
): void {
  let binding: GestureBinding<T> | null = null;

  createEffect(() => {
    const {gestures: list, options} = normalizeDirectiveValue(accessor());
    if (typeof window === 'undefined') {
      return;
    }
    if (binding) {
      binding.update(list, options);
    } else {
      binding = new GestureBinding(element, list, options);
    }
  });

  onCleanup(() => {
    binding?.destroy();
    binding = null;
  });
}

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface Directives {
      gestures: GesturesDirectiveValue;
    }
  }
}
