import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';
import {useEffect, useLayoutEffect, useRef, useState, type RefCallback} from 'react';

export type {GestureTarget, HammerOptions};

export interface UseHammerOptions extends HammerOptions {
  /**
   * Enables or disables gesture recognition without violating the Rules of Hooks.
   * @default true
   */
  enabled?: boolean;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
 * Returns a stable callback ref that attaches a {@link Hammer} instance to the mounted element.
 *
 * Inline callbacks can be passed safely without `useCallback` or `useMemo`: callback identity
 * changes never tear down active gestures while always invoking the latest closure.
 */
export function useHammer<T extends GestureTarget = HTMLElement>(
  options: UseHammerOptions = {}
): RefCallback<T> {
  const [element, setElement] = useState<T | null>(null);
  const {enabled = true, ...hammerOptions} = options;

  const optionsRef = useRef(hammerOptions);
  useIsomorphicLayoutEffect(() => {
    optionsRef.current = hammerOptions;
  });

  const configKey = serializeConfig(hammerOptions);

  useEffect(() => {
    if (!element || !enabled) {
      return;
    }
    const hammer = new Hammer(element, wrapCallbacks(optionsRef));
    return () => hammer.destroy();
  }, [element, enabled, configKey]);

  return setElement;
}
