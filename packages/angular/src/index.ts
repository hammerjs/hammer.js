import {Hammer, type GestureTarget, type HammerOptions} from '@hammerjs/core';

export type {GestureTarget, HammerOptions};

/**
 * Starter entry point for `@hammerjs/angular`.
 *
 * TODO: Add Angular standalone directive / DI provider once Angular packaging is configured.
 */
export function createHammer(element: GestureTarget, options: HammerOptions = {}): Hammer {
  return new Hammer(element, options);
}
