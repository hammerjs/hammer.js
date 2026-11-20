import {Hammer, type GestureTargetElement, type HammerOptions} from '@hammerjs/core';
import {createEffect, createMemo, onCleanup, type Accessor} from 'solid-js';

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
export function createHammer<T extends GestureTargetElement = HTMLElement>(
  target: Accessor<T | null | undefined> | T | null | undefined,
  options: Accessor<HammerOptions> | HammerOptions = {}
): void {
  const optionsRef: {current: HammerOptions} = {current: {}};

  const structuralKey = createMemo(() => {
    const resolved = resolveValue(options);
    optionsRef.current = resolved;
    return serializeConfig(resolved);
  });

  createEffect(() => {
    const element = resolveValue(target);
    structuralKey();
    if (!element || typeof window === 'undefined') {
      return;
    }
    const instance = new Hammer(element, wrapCallbacks(optionsRef));
    onCleanup(() => instance.destroy());
  });
}

/**
 * SolidJS `use:hammer` directive: `<div use:hammer={{ onTap, onPan }} />`.
 */
export function hammer<T extends GestureTargetElement = HTMLElement>(
  element: T,
  accessor: Accessor<HammerOptions>
): void {
  createHammer(element, accessor);
}

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface Directives {
      hammer: HammerOptions;
    }
  }
}
