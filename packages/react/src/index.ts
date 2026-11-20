import {Hammer, type GestureTargetElement, type HammerOptions} from '@hammerjs/core';
import {useEffect, useLayoutEffect, useRef, useState, type RefCallback} from 'react';

export type {GestureTargetElement, HammerOptions};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
 * Returns a stable callback ref that attaches a {@link Hammer} instance to the mounted element.
 *
 * Inline callbacks can be passed safely without `useCallback` or `useMemo`: callback identity
 * changes never tear down active gestures while always invoking the latest closure.
 */
export function useHammer<T extends GestureTargetElement = HTMLElement>(
  options: HammerOptions = {}
): RefCallback<T> {
  const [element, setElement] = useState<T | null>(null);
  const configKey = serializeConfig(options);

  const optionsRef = useRef(options);
  useIsomorphicLayoutEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!element) {
      return;
    }
    const hammer = new Hammer(element, wrapCallbacks(optionsRef));
    return () => {
      hammer.destroy();
    };
  }, [element, configKey]);

  return setElement;
}
