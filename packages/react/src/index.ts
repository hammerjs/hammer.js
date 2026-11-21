import {
  GestureBinding,
  type GestureDescriptor,
  type GesturesOptions,
  type GestureTargetElement,
} from '@hammerjs/core';
import {useEffect, useRef, useState, type RefCallback} from 'react';

export type {GestureDescriptor, GesturesOptions, GestureTargetElement};

/**
 * Tree-shakable React hook that binds declarative {@link GestureDescriptor}s (`tap`, `pan`,
 * `scale`, ...) to the mounted element without importing unused recognizers.
 *
 * Inline callbacks can be passed safely without `useCallback` or `useMemo`: callback identity
 * changes never tear down active gestures while always invoking the latest closure.
 */
export function useGestures<T extends GestureTargetElement = HTMLElement>(
  gestures: readonly GestureDescriptor[],
  options: GesturesOptions = {}
): RefCallback<T> {
  const [element, setElement] = useState<T | null>(null);
  const bindingRef = useRef<GestureBinding<T> | null>(null);

  useEffect(() => {
    if (!element) {
      return;
    }
    const binding = bindingRef.current;
    if (!binding || binding.element !== element) {
      binding?.destroy();
      bindingRef.current = new GestureBinding(element, gestures, options);
    } else {
      binding.update(gestures, options);
    }
  });

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [element]);

  return setElement;
}
