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

const HammerGlobal = Object.assign(Hammer, {
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
});

declare global {
  interface Window {
    Hammer?: typeof HammerGlobal;
  }
}

if (typeof window !== 'undefined') {
  window.Hammer = HammerGlobal;
}

export default HammerGlobal;
