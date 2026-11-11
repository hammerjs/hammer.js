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

interface ResolvedQuickScaleCallbacks {
  readonly hasQuickScale: boolean;
  readonly onScaleStart?: (event: ScaleEventData) => void;
  readonly onScale?: (event: ScaleEventData) => void;
  readonly onScaleEnd?: (event: ScaleEventData) => void;
  readonly onScaleCancel?: () => void;
}

function resolveQuickScaleCallbacks(options: HammerOptions): ResolvedQuickScaleCallbacks {
  const disabled = options.quickScale === false;
  const forward = Boolean(options.quickScale);
  const onScaleStart = disabled
    ? undefined
    : (options.onQuickScaleStart ?? (forward ? options.onScaleStart : undefined));
  const onScale = disabled
    ? undefined
    : (options.onQuickScale ?? (forward ? options.onScale : undefined));
  const onScaleEnd = disabled
    ? undefined
    : (options.onQuickScaleEnd ?? (forward ? options.onScaleEnd : undefined));
  const onScaleCancel = disabled
    ? undefined
    : (options.onQuickScaleCancel ?? (forward ? options.onScaleCancel : undefined));
  return {
    hasQuickScale: Boolean(onScaleStart || onScale || onScaleEnd || onScaleCancel),
    onScaleStart,
    onScale,
    onScaleEnd,
    onScaleCancel,
  };
}

type StructureSignature = readonly (string | number | boolean | undefined)[];

function sameStructure(a: StructureSignature, b: StructureSignature): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

function resolveRecognizerDescriptor(options: HammerOptions) {
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
  const hasDoubleTap = Boolean(options.onDoubleTap);
  const qs = resolveQuickScaleCallbacks(options);

  let quickScaleOpts = typeof options.quickScale === 'object' ? {...options.quickScale} : undefined;
  if (
    qs.hasQuickScale &&
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

  const hasLongPress = Boolean(
    options.onLongPress ||
    options.onLongPressMove ||
    options.onLongPressUp ||
    options.onLongPressCancel
  );
  const hasScale = Boolean(
    options.onScaleStart || options.onScale || options.onScaleEnd || options.onScaleCancel
  );
  const hasRotate = Boolean(
    options.onRotateStart || options.onRotate || options.onRotateEnd || options.onRotateCancel
  );

  const structure: StructureSignature = [
    hasSingleTap,
    Boolean(options.onTap),
    requireDoubleTapFailure,
    hasDoubleTap,
    qs.hasQuickScale,
    hasLongPress,
    hasPanRecognizer,
    hasScale,
    hasRotate,
    options.tap?.numPointers,
    options.tap?.slop,
    options.tap?.maxTime,
    options.tap?.multiTapInterval,
    options.tap?.minTapInterval,
    options.tap?.multiTapSlop,
    options.doubleTap?.numPointers,
    options.doubleTap?.slop,
    options.doubleTap?.maxTime,
    options.doubleTap?.multiTapInterval,
    options.doubleTap?.minTapInterval,
    options.doubleTap?.multiTapSlop,
    quickScaleOpts?.slop,
    quickScaleOpts?.sensitivity,
    options.longPress?.numPointers,
    options.longPress?.slop,
    options.longPress?.duration,
    options.pan?.numPointers,
    options.pan?.slop,
    options.pan?.direction,
    options.pan?.minSwipeVelocity,
    options.pan?.maxSwipeVelocity,
    options.pan?.minSwipeDistance,
    options.scale?.spanSlop,
    options.scale?.minSpan,
    options.rotate?.rotationSlop,
    options.rotate?.minSpan,
  ];

  return {
    structure,
    requireDoubleTapFailure,
    hasPanRecognizer,
    panPointers,
    hasSingleTap,
    hasDoubleTap,
    qs,
    quickScaleOpts,
    hasLongPress,
    hasScale,
    hasRotate,
  };
}

interface BuiltRecognizers {
  readonly structure: StructureSignature;
  readonly list: GestureRecognizer[];
  readonly singleTap: TapRecognizer | null;
  readonly doubleTap: TapRecognizer | null;
  readonly quickScale: QuickScaleRecognizer | null;
  readonly longPress: LongPressRecognizer | null;
  readonly pan: PanRecognizer | null;
  readonly scale: ScaleRecognizer | null;
  readonly rotate: RotateRecognizer | null;
}

function buildRecognizers(options: HammerOptions): BuiltRecognizers {
  const desc = resolveRecognizerDescriptor(options);
  const recognizers: GestureRecognizer[] = [];

  const singleTap = desc.hasSingleTap
    ? new TapRecognizer(
        {
          onDown: options.onTapDown,
          onShowPress: options.onShowPress,
          onTap: options.onTap,
        },
        {...options.tap, taps: 1}
      )
    : null;

  const doubleTap = desc.hasDoubleTap
    ? new TapRecognizer({onTap: options.onDoubleTap}, {...options.doubleTap, taps: 2})
    : null;

  const quickScale = desc.qs.hasQuickScale
    ? new QuickScaleRecognizer(
        {
          onScaleStart: desc.qs.onScaleStart,
          onScale: desc.qs.onScale,
          onScaleEnd: desc.qs.onScaleEnd,
          onScaleCancel: desc.qs.onScaleCancel,
        },
        desc.quickScaleOpts
      )
    : null;

  if (singleTap) {
    const tapPointers = options.tap?.numPointers ?? 1;
    const doubleTapPointers = options.doubleTap?.numPointers ?? 1;
    const samePointersAsDoubleTap = Boolean(doubleTap && tapPointers === doubleTapPointers);

    if (options.onTap && desc.requireDoubleTapFailure) {
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

  const longPress = desc.hasLongPress
    ? new LongPressRecognizer(
        {
          onLongPress: options.onLongPress,
          onLongPressMove: options.onLongPressMove,
          onLongPressUp: options.onLongPressUp,
          onLongPressCancel: options.onLongPressCancel,
        },
        options.longPress
      )
    : null;
  if (longPress) {
    recognizers.push(longPress);
  }

  const pan = desc.hasPanRecognizer
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

  const scale = desc.hasScale
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

  const rotate = desc.hasRotate
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
  if (pan && desc.panPointers !== 1) {
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

  return {
    structure: desc.structure,
    list: recognizers,
    singleTap,
    doubleTap,
    quickScale,
    longPress,
    pan,
    scale,
    rotate,
  };
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
  private built: BuiltRecognizers;

  constructor(element: T, options: HammerOptions = {}) {
    this.element = element;
    this.built = buildRecognizers(options);
    this.manager = new GestureManager(element, {
      supportedPointerTypes: options.supportedPointerTypes,
      touchAction: options.touchAction,
      viewConfiguration: options.viewConfiguration,
      recognizers: this.built.list,
    });
  }

  get config(): ViewConfiguration {
    return this.manager.config;
  }

  /**
   * Updates callbacks and/or gesture configuration in place. When recognizer topology and
   * recognizer options are unchanged, callbacks swap without interrupting active gestures.
   */
  setOptions(options: HammerOptions): this {
    const desc = resolveRecognizerDescriptor(options);
    const managerOptions = {
      supportedPointerTypes:
        options.supportedPointerTypes ?? GestureManager.DEFAULTS.supportedPointerTypes,
      touchAction: options.touchAction ?? GestureManager.DEFAULTS.touchAction,
      viewConfiguration: options.viewConfiguration ?? DEFAULT_VIEW_CONFIGURATION,
    };

    if (sameStructure(desc.structure, this.built.structure)) {
      this.built.singleTap?.setCallbacks({
        onDown: options.onTapDown,
        onShowPress: options.onShowPress,
        onTap: options.onTap,
      });
      this.built.doubleTap?.setCallbacks({onTap: options.onDoubleTap});
      this.built.quickScale?.setCallbacks({
        onScaleStart: desc.qs.onScaleStart,
        onScale: desc.qs.onScale,
        onScaleEnd: desc.qs.onScaleEnd,
        onScaleCancel: desc.qs.onScaleCancel,
      });
      this.built.longPress?.setCallbacks({
        onLongPress: options.onLongPress,
        onLongPressMove: options.onLongPressMove,
        onLongPressUp: options.onLongPressUp,
        onLongPressCancel: options.onLongPressCancel,
      });
      this.built.pan?.setCallbacks({
        onPanStart: options.onPanStart,
        onPan: options.onPan,
        onPanEnd: options.onPanEnd,
        onPanCancel: options.onPanCancel,
        onSwipe: options.onSwipe,
      });
      this.built.scale?.setCallbacks({
        onScaleStart: options.onScaleStart,
        onScale: options.onScale,
        onScaleEnd: options.onScaleEnd,
        onScaleCancel: options.onScaleCancel,
      });
      this.built.rotate?.setCallbacks({
        onRotateStart: options.onRotateStart,
        onRotate: options.onRotate,
        onRotateEnd: options.onRotateEnd,
        onRotateCancel: options.onRotateCancel,
      });
      this.manager.setOptions(managerOptions);
      return this;
    }

    this.manager.unregister(...this.built.list);
    this.built = buildRecognizers(options);
    this.manager.setOptions(managerOptions);
    this.manager.register(...this.built.list);
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
