import {Hammer, type GestureTargetElement, type HammerOptions} from '@hammerjs/core';
import type {ActionReturn} from 'svelte/action';

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
 * Svelte action (`use:hammer`) that attaches a {@link Hammer} instance to an element:
 * `<div use:hammer={{ onTap, onPan }} />`.
 *
 * Reactive `update()` calls that only replace inline closures never cancel active gestures.
 */
export function hammer<T extends GestureTargetElement = HTMLElement>(
  node: T,
  options: HammerOptions = {}
): ActionReturn<HammerOptions | undefined> {
  const optionsRef: {current: HammerOptions} = {current: {}};
  let instance: Hammer<T> | null = null;
  let activeKey: string | null = null;

  const sync = (next: HammerOptions = {}) => {
    if (typeof window === 'undefined') {
      return;
    }
    optionsRef.current = next;
    const nextKey = serializeConfig(next);

    if (activeKey === nextKey) {
      return;
    }

    instance?.destroy();
    instance = new Hammer(node, wrapCallbacks(optionsRef));
    activeKey = nextKey;
  };

  sync(options);

  return {
    update(next) {
      sync(next);
    },
    destroy() {
      instance?.destroy();
      instance = null;
      activeKey = null;
    },
  };
}
