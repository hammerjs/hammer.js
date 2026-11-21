import {
  GestureBinding,
  type GestureDescriptor,
  type GesturesOptions,
  type GestureTargetElement,
} from '@hammerjs/core';
import type {ActionReturn} from 'svelte/action';

export type {GestureDescriptor, GesturesOptions, GestureTargetElement};

export type GesturesActionInput =
  | readonly GestureDescriptor[]
  | ({readonly gestures: readonly GestureDescriptor[]} & GesturesOptions);

function normalizeInput(input: GesturesActionInput | undefined): {
  gestures: readonly GestureDescriptor[];
  options: GesturesOptions;
} {
  if (!input) {
    return {gestures: [], options: {}};
  }
  if (Array.isArray(input)) {
    return {gestures: input, options: {}};
  }
  const {gestures, ...options} = input as {
    readonly gestures: readonly GestureDescriptor[];
  } & GesturesOptions;
  return {gestures, options};
}

/**
 * Tree-shakable Svelte action (`use:gestures`) that binds {@link GestureDescriptor}s to an element
 * without importing unused recognizers:
 * `<div use:gestures={[tap({ onTap }), pan({ onPan })]} />`.
 *
 * Reactive `update()` calls that only replace inline closures never cancel active gestures.
 */
export function gestures<T extends GestureTargetElement = HTMLElement>(
  node: T,
  input: GesturesActionInput = []
): ActionReturn<GesturesActionInput | undefined> {
  const initial = normalizeInput(input);
  let binding: GestureBinding<T> | null =
    typeof window !== 'undefined'
      ? new GestureBinding(node, initial.gestures, initial.options)
      : null;

  return {
    update(next) {
      if (typeof window === 'undefined') {
        return;
      }
      const parsed = normalizeInput(next);
      if (binding) {
        binding.update(parsed.gestures, parsed.options);
      } else {
        binding = new GestureBinding(node, parsed.gestures, parsed.options);
      }
    },
    destroy() {
      binding?.destroy();
      binding = null;
    },
  };
}
