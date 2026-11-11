import {GestureManager, type GestureManagerOptions} from './gesture_manager.js';
import type {GestureRecognizer} from './gesture_recognizer.js';
import {
  LongPressRecognizer,
  type LongPressEventData,
  type LongPressOptions,
} from './recognizers/long_press_recognizer.js';
import {
  PanRecognizer,
  type PanEventData,
  type PanOptions,
  type SwipeEventData,
} from './recognizers/pan_recognizer.js';
import {
  QuickScaleRecognizer,
  type QuickScaleOptions,
} from './recognizers/quick_scale_recognizer.js';
import {
  RotateRecognizer,
  type RotateEventData,
  type RotateOptions,
} from './recognizers/rotate_recognizer.js';
import {
  ScaleRecognizer,
  type ScaleEventData,
  type ScaleOptions,
} from './recognizers/scale_recognizer.js';
import {TapRecognizer, type TapEventData, type TapOptions} from './recognizers/tap_recognizer.js';
import type {GestureTarget, TouchActionSetting, TouchActionValue} from './touch_behavior.js';
import {DEFAULT_VIEW_CONFIGURATION, type ViewConfiguration} from './view_configuration.js';

export interface HammerOptions {
  supportedPointerTypes?: GestureManagerOptions['supportedPointerTypes'];
  touchAction?: TouchActionSetting;
  viewConfiguration?: Partial<ViewConfiguration>;

  onTap?: (event: TapEventData) => void;
  onTapDown?: (event: TapEventData) => void;
  /** Fired if the pointer stays within tap slop past `ViewConfiguration.tapTimeout`. */
  onShowPress?: (event: TapEventData) => void;
  onDoubleTap?: (event: TapEventData) => void;
  tap?: Partial<Omit<TapOptions, 'taps'>>;
  doubleTap?: Partial<Omit<TapOptions, 'taps'>>;
  /**
   * Wait for `onDoubleTap` and `QuickScale` to fail before firing `onTap` (`true` by default).
   * Set to `false` to fire `onTap` immediately on first release.
   */
  requireDoubleTapFailure?: boolean;

  onLongPress?: (event: LongPressEventData) => void;
  onLongPressMove?: (event: LongPressEventData) => void;
  onLongPressUp?: (event: LongPressEventData) => void;
  onLongPressCancel?: () => void;
  longPress?: Partial<LongPressOptions>;

  onPanStart?: (event: PanEventData) => void;
  onPan?: (event: PanEventData) => void;
  onPanEnd?: (event: PanEventData) => void;
  onPanCancel?: () => void;
  onSwipe?: (event: SwipeEventData) => void;
  /** Pan options. Pass `{numPointers: 0}` to pan simultaneously alongside `scale` / `rotate`. */
  pan?: Partial<PanOptions>;

  onScaleStart?: (event: ScaleEventData) => void;
  onScale?: (event: ScaleEventData) => void;
  onScaleEnd?: (event: ScaleEventData) => void;
  onScaleCancel?: () => void;
  onQuickScaleStart?: (event: ScaleEventData) => void;
  onQuickScale?: (event: ScaleEventData) => void;
  onQuickScaleEnd?: (event: ScaleEventData) => void;
  onQuickScaleCancel?: () => void;
  scale?: Partial<ScaleOptions>;
  /**
   * Enables 1-finger double-tap-and-drag scaling, forwarding to `onScale*` when dedicated
   * `onQuickScale*` callbacks are not provided. Pass `false` to disable explicitly.
   */
  quickScale?: boolean | Partial<QuickScaleOptions>;

  onRotateStart?: (event: RotateEventData) => void;
  onRotate?: (event: RotateEventData) => void;
  onRotateEnd?: (event: RotateEventData) => void;
  onRotateCancel?: () => void;
  rotate?: Partial<RotateOptions>;
}

function buildRecognizers(options: HammerOptions): GestureRecognizer[] {
  const recognizers: GestureRecognizer[] = [];
  const requireDoubleTapFailure = options.requireDoubleTapFailure ?? true;

  const hasPan = Boolean(
    options.onPanStart ||
    options.onPan ||
    options.onPanEnd ||
    options.onPanCancel ||
    options.onSwipe
  );
  const panPointers = options.pan?.numPointers ?? 1;

  const hasSingleTap = Boolean(options.onTap || options.onTapDown || options.onShowPress);
  const singleTap = hasSingleTap
    ? new TapRecognizer(
        {
          onDown: options.onTapDown,
          onShowPress: options.onShowPress,
          onTap: options.onTap,
        },
        {...options.tap, taps: 1}
      )
    : null;

  const doubleTap = options.onDoubleTap
    ? new TapRecognizer({onTap: options.onDoubleTap}, {...options.doubleTap, taps: 2})
    : null;

  const qsDisabled = options.quickScale === false;
  const qsForward = Boolean(options.quickScale);
  const qsStart = qsDisabled
    ? undefined
    : (options.onQuickScaleStart ?? (qsForward ? options.onScaleStart : undefined));
  const qsChange = qsDisabled
    ? undefined
    : (options.onQuickScale ?? (qsForward ? options.onScale : undefined));
  const qsEnd = qsDisabled
    ? undefined
    : (options.onQuickScaleEnd ?? (qsForward ? options.onScaleEnd : undefined));
  const qsCancel = qsDisabled
    ? undefined
    : (options.onQuickScaleCancel ?? (qsForward ? options.onScaleCancel : undefined));
  const hasQuickScale = Boolean(qsStart || qsChange || qsEnd || qsCancel);

  const quickScaleOpts = typeof options.quickScale === 'object' ? options.quickScale : undefined;
  const quickScale = hasQuickScale
    ? new QuickScaleRecognizer(
        {
          onScaleStart: qsStart,
          onScale: qsChange,
          onScaleEnd: qsEnd,
          onScaleCancel: qsCancel,
        },
        quickScaleOpts
      )
    : null;

  if (singleTap) {
    const tapPointers = options.tap?.numPointers ?? 1;
    const doubleTapPointers = options.doubleTap?.numPointers ?? 1;
    const samePointersAsDoubleTap = Boolean(doubleTap && tapPointers === doubleTapPointers);

    if (options.onTap && requireDoubleTapFailure) {
      if (doubleTap && samePointersAsDoubleTap) {
        singleTap.requireFailureOf(doubleTap);
      }
      if (quickScale && tapPointers === 1) {
        singleTap.requireFailureOf(quickScale);
      }
    } else if (doubleTap && samePointersAsDoubleTap) {
      // Allow tap #1 to succeed without denying doubleTap before tap #2 arrives.
      singleTap.simultaneousWith(doubleTap);
    }
    recognizers.push(singleTap);
  }
  if (doubleTap) {
    recognizers.push(doubleTap);
  }
  if (quickScale) {
    recognizers.push(quickScale);
  }

  const hasLongPress = Boolean(
    options.onLongPress ||
    options.onLongPressMove ||
    options.onLongPressUp ||
    options.onLongPressCancel
  );
  if (hasLongPress) {
    recognizers.push(
      new LongPressRecognizer(
        {
          onLongPress: options.onLongPress,
          onLongPressMove: options.onLongPressMove,
          onLongPressUp: options.onLongPressUp,
          onLongPressCancel: options.onLongPressCancel,
        },
        options.longPress
      )
    );
  }

  const pan = hasPan
    ? new PanRecognizer(
        {
          onPanStart: options.onPanStart,
          onPan: options.onPan,
          onPanEnd: options.onPanEnd,
          onPanCancel: options.onPanCancel,
          onSwipe: options.onSwipe,
        },
        options.pan
      )
    : null;
  if (pan) {
    recognizers.push(pan);
  }

  const hasScale = Boolean(
    options.onScaleStart || options.onScale || options.onScaleEnd || options.onScaleCancel
  );
  const scale = hasScale
    ? new ScaleRecognizer(
        {
          onScaleStart: options.onScaleStart,
          onScale: options.onScale,
          onScaleEnd: options.onScaleEnd,
          onScaleCancel: options.onScaleCancel,
        },
        options.scale
      )
    : null;

  const hasRotate = Boolean(
    options.onRotateStart || options.onRotate || options.onRotateEnd || options.onRotateCancel
  );
  const rotate = hasRotate
    ? new RotateRecognizer(
        {
          onRotateStart: options.onRotateStart,
          onRotate: options.onRotate,
          onRotateEnd: options.onRotateEnd,
          onRotateCancel: options.onRotateCancel,
        },
        options.rotate
      )
    : null;

  if (scale && rotate) {
    scale.simultaneousWith(rotate);
  }
  if (pan && panPointers !== 1) {
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
export class Hammer<T extends GestureTarget = GestureTarget> {
  readonly element: T;
  readonly manager: GestureManager<T>;
  private recognizers: GestureRecognizer[];

  constructor(element: T, options: HammerOptions = {}) {
    this.element = element;
    this.recognizers = buildRecognizers(options);
    this.manager = new GestureManager(element, {
      supportedPointerTypes: options.supportedPointerTypes,
      touchAction: options.touchAction,
      viewConfiguration: options.viewConfiguration,
      recognizers: this.recognizers,
    });
  }

  get config(): ViewConfiguration {
    return this.manager.config;
  }

  setOptions(options: HammerOptions): this {
    this.manager.unregister(...this.recognizers);
    this.recognizers = buildRecognizers(options);
    this.manager.setOptions({
      supportedPointerTypes:
        options.supportedPointerTypes ?? GestureManager.DEFAULTS.supportedPointerTypes,
      touchAction: options.touchAction ?? GestureManager.DEFAULTS.touchAction,
      viewConfiguration: options.viewConfiguration ?? DEFAULT_VIEW_CONFIGURATION,
    });
    this.manager.register(...this.recognizers);
    return this;
  }

  computeTouchAction(): TouchActionValue {
    return this.manager.computeTouchAction();
  }

  reset(): void {
    this.manager.reset();
  }

  destroy(): void {
    this.manager.destroy();
  }
}
