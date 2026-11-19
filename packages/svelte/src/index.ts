import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';
import type {ActionReturn} from 'svelte/action';

export type {GestureTarget, HammerOptions};

export interface HammerActionOptions extends HammerOptions {
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
 * Svelte action (`use:hammer`) that attaches a {@link Hammer} instance to an element:
 * `<div use:hammer={{ onTap, onPan }} />`.
 *
 * Reactive `update()` calls that only replace inline closures never cancel active gestures.
 */
export function hammer<T extends GestureTarget = HTMLElement>(
  node: T,
  options: HammerActionOptions = {}
): ActionReturn<HammerActionOptions | undefined> {
  const optionsRef: {current: HammerOptions} = {current: {}};
  let instance: Hammer<T> | null = null;
  let activeKey: string | null = null;

  const sync = (next: HammerActionOptions = {}) => {
    if (typeof window === 'undefined') {
      return;
    }
    const {enabled = true, ...hammerOptions} = next;
    optionsRef.current = hammerOptions;
    const nextKey = enabled ? serializeConfig(hammerOptions) : null;

    if (activeKey === nextKey) {
      return;
    }

    instance?.destroy();
    instance = nextKey !== null ? new Hammer(node, wrapCallbacks(optionsRef)) : null;
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
