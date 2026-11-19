import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';
import type {ActionReturn} from 'svelte/action';

export type {GestureTarget, HammerOptions};

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
 * Svelte action (`use:hammer`) that attaches a {@link Hammer} instance to an element:
 * `<div use:hammer={{ onTap, onPan }} />`.
 *
 * Reactive `update()` calls that only replace inline closures never cancel active gestures.
 */
export function hammer<T extends GestureTarget = HTMLElement>(
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
