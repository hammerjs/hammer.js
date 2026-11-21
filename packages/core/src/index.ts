/**
 * Tree-shakable ESM public entry point for `@hammerjs/core` (`dist/hammer.es.js`).
 * For the classic non-ESM `window.Hammer` bundle (`dist/hammer.min.js`), see `src/global.ts`.
 */

export {Hammer, type HammerOptions} from './hammer.js';
export {GestureManager, type GestureManagerOptions, type PointerType} from './gesture_manager.js';
export {
  GestureBinding,
  type CallbackWrapper,
  type GestureBindingOptions,
  type GesturesOptions,
} from './gesture_binding.js';
export {gesture, type GestureDescriptor} from './descriptors.js';
export {
  GestureRecognizer,
  type GestureEventData,
  type GestureKind,
  type RecognizerState,
} from './gesture_recognizer.js';
export type {MotionEvent, Point} from './motion_event.js';
export type {GestureTargetElement, TouchActionSetting, TouchActionValue} from './touch_action.js';

export {
  longPress,
  LongPressRecognizer,
  type LongPressEventData,
  type LongPressGestureOptions,
} from './recognizers/long_press_recognizer.js';
export {
  pan,
  PanRecognizer,
  swipe,
  type CardinalDirection,
  type PanDirection,
  type PanEventData,
  type PanGestureOptions,
  type SwipeEventData,
  type SwipeGestureOptions,
} from './recognizers/pan_recognizer.js';
export {
  quickScale,
  QuickScaleRecognizer,
  type QuickScaleGestureOptions,
} from './recognizers/quick_scale_recognizer.js';
export {
  rotate,
  RotateRecognizer,
  type RotateEventData,
  type RotateGestureOptions,
} from './recognizers/rotate_recognizer.js';
export {
  scale,
  ScaleRecognizer,
  type ScaleEventData,
  type ScaleGestureOptions,
} from './recognizers/scale_recognizer.js';
export {
  doubleTap,
  tap,
  TapRecognizer,
  type DoubleTapGestureOptions,
  type TapGestureOptions,
} from './recognizers/tap_recognizer.js';
