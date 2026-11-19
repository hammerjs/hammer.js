import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';
import {createEffect, createMemo, onCleanup, type Accessor} from 'solid-js';

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

function resolveValue<V>(value: Accessor<V> | V): V {
  return typeof value === 'function' ? (value as Accessor<V>)() : value;
}

/**
 * SolidJS reactive primitive that attaches a {@link Hammer} instance to an element or
 * element accessor and cleans it up automatically when the reactive owner disposes.
 *
 * Inline callbacks inside reactive option accessors never cancel active gestures when
 * signals update mid-drag.
 */
export function createHammer<T extends GestureTarget = HTMLElement>(
  target: Accessor<T | null | undefined> | T | null | undefined,
  options: Accessor<UseHammerOptions> | UseHammerOptions = {}
): void {
  const optionsRef: {current: HammerOptions} = {current: {}};

  const structuralKey = createMemo(() => {
    const {enabled = true, ...hammerOptions} = resolveValue(options);
    optionsRef.current = hammerOptions;
    return enabled ? serializeConfig(hammerOptions) : null;
  });

  createEffect(() => {
    const element = resolveValue(target);
    const key = structuralKey();
    if (!element || key === null || typeof window === 'undefined') {
      return;
    }
    const instance = new Hammer(element, wrapCallbacks(optionsRef));
    onCleanup(() => instance.destroy());
  });
}

/**
 * SolidJS `use:hammer` directive: `<div use:hammer={{ onTap, onPan }} />`.
 */
export function hammer<T extends GestureTarget = HTMLElement>(
  element: T,
  accessor: Accessor<UseHammerOptions>
): void {
  createHammer(element, accessor);
}
