/**
 * Dedicated entry point for the classic, non-ESM browser bundle (`dist/hammer.min.js`),
 * built via `vite.iife.config.ts` (`npm run build:iife`).
 *
 * This file is NOT imported by `src/index.ts` and is excluded from ESM / `.d.ts` output.
 * It attaches the public v3 APIs onto `Hammer` and assigns `window.Hammer` for `<script>`
 * drop-in usage (intentionally omitting `GestureBinding`, which is only for framework adapters).
 */

import {gesture} from './descriptors.js';
import {GestureManager} from './gesture_manager.js';
import {GestureRecognizer} from './gesture_recognizer.js';
import {Hammer} from './hammer.js';
import {longPress, LongPressRecognizer} from './recognizers/long_press_recognizer.js';
import {pan, PanRecognizer, swipe} from './recognizers/pan_recognizer.js';
import {quickScale, QuickScaleRecognizer} from './recognizers/quick_scale_recognizer.js';
import {rotate, RotateRecognizer} from './recognizers/rotate_recognizer.js';
import {scale, ScaleRecognizer} from './recognizers/scale_recognizer.js';
import {doubleTap, tap, TapRecognizer} from './recognizers/tap_recognizer.js';

/** @public */
export interface HammerGlobalStatics {
  readonly Hammer: typeof Hammer;
  readonly GestureManager: typeof GestureManager;
  readonly gesture: typeof gesture;
  readonly GestureRecognizer: typeof GestureRecognizer;
  readonly tap: typeof tap;
  readonly doubleTap: typeof doubleTap;
  readonly longPress: typeof longPress;
  readonly pan: typeof pan;
  readonly swipe: typeof swipe;
  readonly scale: typeof scale;
  readonly quickScale: typeof quickScale;
  readonly rotate: typeof rotate;
  readonly TapRecognizer: typeof TapRecognizer;
  readonly LongPressRecognizer: typeof LongPressRecognizer;
  readonly PanRecognizer: typeof PanRecognizer;
  readonly ScaleRecognizer: typeof ScaleRecognizer;
  readonly QuickScaleRecognizer: typeof QuickScaleRecognizer;
  readonly RotateRecognizer: typeof RotateRecognizer;
}

const statics: HammerGlobalStatics = {
  Hammer,
  GestureManager,
  gesture,
  GestureRecognizer,
  tap,
  doubleTap,
  longPress,
  pan,
  swipe,
  scale,
  quickScale,
  rotate,
  TapRecognizer,
  LongPressRecognizer,
  PanRecognizer,
  ScaleRecognizer,
  QuickScaleRecognizer,
  RotateRecognizer,
};

const HammerGlobal = Object.assign(Hammer, statics);

declare global {
  interface Window {
    /** @public */
    Hammer?: typeof HammerGlobal;
  }
}

if (typeof window !== 'undefined') {
  window.Hammer = HammerGlobal;
}

export default HammerGlobal;
