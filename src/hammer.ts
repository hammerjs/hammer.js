import {GestureManager, type GestureManagerOptions} from './gesture_manager';
import type {GestureRecognizer} from './gesture_recognizer';
import {
  LongPressRecognizer,
  type LongPressEventData,
  type LongPressOptions,
} from './recognizers/long_press_recognizer';
import {
  PanRecognizer,
  type PanEventData,
  type PanOptions,
  type SwipeEventData,
} from './recognizers/pan_recognizer';
import {QuickScaleRecognizer, type QuickScaleOptions} from './recognizers/quick_scale_recognizer';
import {
  RotateRecognizer,
  type RotateEventData,
  type RotateOptions,
} from './recognizers/rotate_recognizer';
import {
  ScaleRecognizer,
  type ScaleEventData,
  type ScaleOptions,
} from './recognizers/scale_recognizer';
import {TapRecognizer, type TapEventData, type TapOptions} from './recognizers/tap_recognizer';
import type {TouchActionSetting, TouchActionValue} from './touch_behavior';
import {DEFAULT_VIEW_CONFIGURATION, type ViewConfiguration} from './view_configuration';

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

  const hasPanRecognizer = Boolean(
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

  const quickScaleDisabled = options.quickScale === false;
  const forwardQuickScaleToScale = Boolean(options.quickScale);
  const qsStart = quickScaleDisabled
    ? undefined
    : (options.onQuickScaleStart ?? (forwardQuickScaleToScale ? options.onScaleStart : undefined));
  const qsChange = quickScaleDisabled
    ? undefined
    : (options.onQuickScale ?? (forwardQuickScaleToScale ? options.onScale : undefined));
  const qsEnd = quickScaleDisabled
    ? undefined
    : (options.onQuickScaleEnd ?? (forwardQuickScaleToScale ? options.onScaleEnd : undefined));
  const qsCancel = quickScaleDisabled
    ? undefined
    : (options.onQuickScaleCancel ??
      (forwardQuickScaleToScale ? options.onScaleCancel : undefined));
  const hasQuickScale = Boolean(qsStart || qsChange || qsEnd || qsCancel);

  let quickScaleOpts = typeof options.quickScale === 'object' ? {...options.quickScale} : undefined;
  if (
    hasQuickScale &&
    hasPanRecognizer &&
    panPointers <= 1 &&
    options.pan?.slop !== undefined &&
    quickScaleOpts?.slop === undefined
  ) {
    // Keep QuickScale's slop at or below a tighter custom pan slop so multi-frame drags on
    // stroke #2 aren't claimed by Pan before QuickScale crosses touchSlop.
    const defaultSlop =
      options.viewConfiguration?.touchSlop ?? DEFAULT_VIEW_CONFIGURATION.touchSlop;
    if (options.pan.slop < defaultSlop) {
      quickScaleOpts = {...quickScaleOpts, slop: options.pan.slop};
    }
  }

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

  const pan = hasPanRecognizer
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
 * Convenience wrapper around `GestureManager` that configures recognizers, arena relationships,
 * and `touch-action` defaults from a single options object.
 */
export class Hammer {
  readonly element: HTMLElement;
  readonly manager: GestureManager;

  constructor(element: HTMLElement, options: HammerOptions = {}) {
    this.element = element;
    this.manager = new GestureManager(element, {
      supportedPointerTypes: options.supportedPointerTypes,
      touchAction: options.touchAction,
      viewConfiguration: options.viewConfiguration,
      recognizers: buildRecognizers(options),
    });
  }

  get config(): ViewConfiguration {
    return this.manager.config;
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
