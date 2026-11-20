import {GestureManager, type PointerType} from './gesture_manager.js';
import type {GestureEventData, GestureRecognizer} from './gesture_recognizer.js';
import {
  type LongPressCallbacks,
  LongPressRecognizer,
  type LongPressOptions,
} from './recognizers/long_press_recognizer.js';
import {type PanCallbacks, PanRecognizer, type PanOptions} from './recognizers/pan_recognizer.js';
import {
  QuickScaleRecognizer,
  type QuickScaleOptions,
} from './recognizers/quick_scale_recognizer.js';
import {
  type RotateCallbacks,
  RotateRecognizer,
  type RotateOptions,
} from './recognizers/rotate_recognizer.js';
import {
  type ScaleCallbacks,
  ScaleRecognizer,
  type ScaleOptions,
} from './recognizers/scale_recognizer.js';
import {TapRecognizer, type TapOptions} from './recognizers/tap_recognizer.js';
import type {GestureTargetElement, TouchActionSetting} from './touch_behavior.js';

export interface HammerOptions
  extends LongPressCallbacks, PanCallbacks, ScaleCallbacks, RotateCallbacks {
  supportedPointerTypes?: readonly PointerType[];
  touchAction?: TouchActionSetting;
  ignoreTarget?: boolean | ((target: EventTarget) => boolean);

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

function buildRecognizers(options: HammerOptions): GestureRecognizer[] {
  const recognizers: GestureRecognizer[] = [];

  const singleTap = options.onTap
    ? new TapRecognizer({onTap: options.onTap}, {...options.tap, taps: 1})
    : null;

  const doubleTap = options.onDoubleTap
    ? new TapRecognizer({onTap: options.onDoubleTap}, {...options.doubleTap, taps: 2})
    : null;

  const hasScale = Boolean(
    options.onScaleStart || options.onScale || options.onScaleEnd || options.onScaleCancel
  );

  const quickScale =
    hasScale && options.quickScale
      ? new QuickScaleRecognizer(
          options,
          typeof options.quickScale === 'object' ? options.quickScale : undefined
        )
      : null;

  if (singleTap) {
    const tapPointers = options.tap?.numPointers ?? 1;
    const doubleTapPointers = options.doubleTap?.numPointers ?? 1;
    if (doubleTap && tapPointers === doubleTapPointers) {
      singleTap.requireFailureOf(doubleTap);
    }
    if (quickScale && tapPointers === 1) {
      singleTap.requireFailureOf(quickScale);
    }
    recognizers.push(singleTap);
  }
  if (doubleTap) {
    recognizers.push(doubleTap);
  }
  if (quickScale) {
    recognizers.push(quickScale);
  }

  if (
    options.onLongPress ||
    options.onLongPressMove ||
    options.onLongPressUp ||
    options.onLongPressCancel
  ) {
    recognizers.push(new LongPressRecognizer(options, options.longPress));
  }

  const hasPan = Boolean(
    options.onPanStart ||
    options.onPan ||
    options.onPanEnd ||
    options.onPanCancel ||
    options.onSwipe
  );
  const pan = hasPan ? new PanRecognizer(options, options.pan) : null;
  if (pan) {
    recognizers.push(pan);
  }

  const scale = hasScale ? new ScaleRecognizer(options, options.scale) : null;
  const hasRotate = Boolean(
    options.onRotateStart || options.onRotate || options.onRotateEnd || options.onRotateCancel
  );
  const rotate = hasRotate ? new RotateRecognizer(options, options.rotate) : null;

  if (scale && rotate) {
    scale.simultaneousWith(rotate);
  }
  if (pan && (options.pan?.numPointers ?? 1) !== 1) {
    if (scale) {
      pan.simultaneousWith(scale);
    }
    if (rotate) {
      pan.simultaneousWith(rotate);
    }
  }

  if (scale) {
    recognizers.push(scale);
  }
  if (rotate) {
    recognizers.push(rotate);
  }

  return recognizers;
}

/**
 * Batteries-included convenience wrapper around `GestureManager` that configures recognizers,
 * arena relationships, and `touch-action` defaults from a single options object.
 *
 * Note: importing `Hammer` bundles all built-in recognizers. For minimal tree-shaken bundles,
 * import `GestureManager` and only the individual recognizers you need.
 */
export class Hammer<T extends GestureTargetElement = GestureTargetElement> {
  readonly manager: GestureManager<T>;

  constructor(element: T, options: HammerOptions = {}) {
    this.manager = new GestureManager(element, {
      supportedPointerTypes: options.supportedPointerTypes,
      touchAction: options.touchAction,
      ignoreTarget: options.ignoreTarget,
      recognizers: buildRecognizers(options),
    });
  }

  cancel(): void {
    this.manager.cancel();
  }

  destroy(): void {
    this.manager.destroy();
  }
}
