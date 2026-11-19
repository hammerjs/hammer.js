import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';
import {useEffect, useRef, type RefObject} from 'react';

export type {GestureTarget, HammerOptions};

/**
 * Attaches a {@link Hammer} instance to a React element ref and cleans it up on unmount.
 */
export function useHammer<T extends GestureTarget>(
  target: RefObject<T | null>,
  options: HammerOptions
): void {
  const hammerRef = useRef<Hammer | null>(null);

  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }
    const hammer = new Hammer(element, options);
    hammerRef.current = hammer;
    return () => {
      hammer.destroy();
      hammerRef.current = null;
    };
  }, [target]);

  useEffect(() => {
    hammerRef.current?.setOptions(options);
  }, [options]);
}
