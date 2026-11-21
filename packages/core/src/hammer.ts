import type {GestureDescriptor} from './descriptors.js';
import {GestureManager, type GestureManagerOptions} from './gesture_manager.js';
import type {GestureEventData} from './gesture_recognizer.js';
import {
  longPress,
  type LongPressCallbacks,
  type LongPressOptions,
} from './recognizers/long_press_recognizer.js';
import {pan, type PanCallbacks, type PanOptions} from './recognizers/pan_recognizer.js';
import {quickScale, type QuickScaleOptions} from './recognizers/quick_scale_recognizer.js';
import {rotate, type RotateCallbacks, type RotateOptions} from './recognizers/rotate_recognizer.js';
import {scale, type ScaleCallbacks, type ScaleOptions} from './recognizers/scale_recognizer.js';
import {doubleTap, tap, type TapOptions} from './recognizers/tap_recognizer.js';
import type {GestureTargetElement} from './touch_action.js';

export interface HammerOptions
  extends
    Pick<
      GestureManagerOptions,
      'enabled' | 'supportedPointerTypes' | 'touchAction' | 'ignoreTarget' | 'propagate'
    >,
    LongPressCallbacks,
    PanCallbacks,
    ScaleCallbacks,
    RotateCallbacks {
  onTap?: (event: GestureEventData) => void;
  onDoubleTap?: (event: GestureEventData) => void;
  tap?: Partial<Omit<TapOptions, 'taps'>>;
  doubleTap?: Partial<Omit<TapOptions, 'taps'>>;
  longPress?: Partial<LongPressOptions>;
  /** Pan options. Pass `{numPointers: 0}` to pan simultaneously alongside `scale` / `rotate`. */
  pan?: Partial<PanOptions>;
  scale?: Partial<ScaleOptions>;
  /**
   * Enables 1-finger double-tap-and-drag scaling, forwarding events to `onScale*`
   * (with `event.isQuickScale === true`).
   */
  quickScale?: boolean | Partial<QuickScaleOptions>;
  rotate?: Partial<RotateOptions>;
}

function buildGestures(options: HammerOptions): GestureDescriptor[] {
  const gestures: GestureDescriptor[] = [];

  if (options.onTap) {
    gestures.push(tap({...options.tap, taps: 1, onTap: options.onTap}));
  }
  if (options.onDoubleTap) {
    gestures.push(doubleTap({...options.doubleTap, onTap: options.onDoubleTap}));
  }

  const hasScale = Boolean(
    options.onScaleStart || options.onScale || options.onScaleEnd || options.onScaleCancel
  );
  if (hasScale && options.quickScale) {
    const qsOpts = typeof options.quickScale === 'object' ? options.quickScale : undefined;
    gestures.push(
      quickScale({
        ...qsOpts,
        onScaleStart: options.onScaleStart,
        onScale: options.onScale,
        onScaleEnd: options.onScaleEnd,
        onScaleCancel: options.onScaleCancel,
      })
    );
  }

  if (
    options.onLongPress ||
    options.onLongPressMove ||
    options.onLongPressUp ||
    options.onLongPressCancel
  ) {
    gestures.push(
      longPress({
        ...options.longPress,
        onLongPress: options.onLongPress,
        onLongPressMove: options.onLongPressMove,
        onLongPressUp: options.onLongPressUp,
        onLongPressCancel: options.onLongPressCancel,
      })
    );
  }

  if (
    options.onPanStart ||
    options.onPan ||
    options.onPanEnd ||
    options.onPanCancel ||
    options.onSwipe
  ) {
    gestures.push(
      pan({
        ...options.pan,
        onPanStart: options.onPanStart,
        onPan: options.onPan,
        onPanEnd: options.onPanEnd,
        onPanCancel: options.onPanCancel,
        onSwipe: options.onSwipe,
      })
    );
  }

  if (hasScale) {
    gestures.push(
      scale({
        ...options.scale,
        onScaleStart: options.onScaleStart,
        onScale: options.onScale,
        onScaleEnd: options.onScaleEnd,
        onScaleCancel: options.onScaleCancel,
      })
    );
  }

  if (options.onRotateStart || options.onRotate || options.onRotateEnd || options.onRotateCancel) {
    gestures.push(
      rotate({
        ...options.rotate,
        onRotateStart: options.onRotateStart,
        onRotate: options.onRotate,
        onRotateEnd: options.onRotateEnd,
        onRotateCancel: options.onRotateCancel,
      })
    );
  }

  return gestures;
}

/**
 * Batteries-included convenience wrapper around `GestureManager` that configures recognizers,
 * arena relationships, and `touch-action` defaults from a single options object.
 *
 * Note: importing `Hammer` bundles all built-in recognizers. For minimal tree-shaken bundles,
 * import `GestureManager` (or a framework `useGestures` adapter) with only the descriptor
 * factories (`tap`, `pan`, `scale`, ...) you need.
 */
export class Hammer<T extends GestureTargetElement = GestureTargetElement> {
  readonly manager: GestureManager<T>;

  constructor(element: T, options: HammerOptions = {}) {
    this.manager = new GestureManager(element, {
      enabled: options.enabled,
      supportedPointerTypes: options.supportedPointerTypes,
      touchAction: options.touchAction,
      ignoreTarget: options.ignoreTarget,
      propagate: options.propagate,
      gestures: buildGestures(options),
    });
  }

  cancel(): void {
    this.manager.cancel();
  }

  destroy(): void {
    this.manager.destroy();
  }
}
