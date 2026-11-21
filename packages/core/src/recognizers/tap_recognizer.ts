import {createDescriptor, type GestureDescriptor} from '../descriptors.js';
import {distance, type MotionEvent, type Point} from '../motion_event.js';
import {type GestureEventData, type GestureKind, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_action.js';
import {
  DOUBLE_TAP_SLOP,
  DOUBLE_TAP_TIMEOUT_MS,
  isWithinTapSlop,
  isWithinTapWindow,
  MAX_TAP_DURATION_MS,
  type TapAnchor,
} from './multi_tap_window.js';

const DEFAULT_SLOP = 8;

interface ActiveStroke {
  readonly downTime: number;
  totalPointers: number;
  downCenter: Point | null;
  center: Point | null;
}

interface MultiTapSequence {
  readonly completedTaps: number;
  readonly lastTap: TapAnchor;
}

export interface TapOptions {
  /** Required number of consecutive taps (`1` for single-tap, `2` for double-tap, etc.). Default: `1`. */
  taps: number;
  /** Required number of simultaneous pointers per tap. Default: `1`. */
  numPointers: number;
  /** Maximum radial movement in `px` allowed per pointer during a tap. Default: `8`. */
  slop: number;
  /** Maximum press duration in `ms` (`down` to `up`) per tap. Default: `250`. */
  maxTime: number;
  /** Maximum interval in `ms` allowed between consecutive taps in a multi-tap sequence. Default: `300`. */
  multiTapInterval: number;
  /** Maximum distance in `px` between consecutive tap-down locations. Default: `100`. */
  multiTapSlop: number;
}

export interface TapCallbacks {
  /** Fired when the configured `taps` count completes. */
  onTap?: (event: GestureEventData) => void;
}

/**
 * Atomic single- or multi-tap recognizer (`taps: 1`, `taps: 2`, ...).
 *
 * Compose confirmed single-tap + double-tap cleanly via `GestureArena`:
 * ```ts
 * const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2});
 * const singleTap = new TapRecognizer({onTap: onSingleTap}).requireFailureOf(doubleTap);
 * ```
 */
export class TapRecognizer extends GestureRecognizer {
  private readonly callbacks: TapCallbacks;
  private readonly targetTaps: number;
  private readonly numPointers: number;
  private readonly slop: number;
  private readonly maxTime: number;
  private readonly multiTapInterval: number;
  private readonly multiTapSlop: number;

  private readonly downPositions = new Map<number, Point>();
  private stroke: ActiveStroke | null = null;
  private sequence: MultiTapSequence | null = null;

  constructor(callbacks: TapCallbacks, options: Partial<TapOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.targetTaps = options.taps ?? 1;
    this.numPointers = options.numPointers ?? 1;
    this.slop = Math.max(0, options.slop ?? DEFAULT_SLOP);
    this.maxTime = options.maxTime ?? MAX_TAP_DURATION_MS;
    this.multiTapInterval = options.multiTapInterval ?? DOUBLE_TAP_TIMEOUT_MS;
    this.multiTapSlop = Math.max(0, options.multiTapSlop ?? DOUBLE_TAP_SLOP);
  }

  override get gestureKind(): GestureKind {
    return 'discrete';
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return this.numPointers >= 2;
  }

  /** @internal */
  override prepareForDown(event: MotionEvent): void {
    if (!this.sequence) {
      return;
    }

    const withinWindow = isWithinTapWindow(event, this.sequence.lastTap, this.multiTapInterval);
    const outOfSlop =
      event.activePointerCount >= this.numPointers &&
      !isWithinTapSlop(event.focus, this.sequence.lastTap, this.multiTapSlop);

    if (!withinWindow || outOfSlop) {
      this.fail();
    } else {
      this.clearTimer();
    }
  }

  /** @internal */
  override shouldResetOnDown(): boolean {
    return this.sequence ? false : super.shouldResetOnDown();
  }

  protected override onDown(event: MotionEvent): void {
    this.downPositions.clear();
    for (const p of event.pointers) {
      this.downPositions.set(p.pointerId, p);
    }

    const initialCenter = event.activePointerCount === this.numPointers ? event.focus : null;
    this.stroke = {
      downTime: event.eventTime,
      totalPointers: event.pointers.length,
      downCenter: initialCenter,
      center: initialCenter,
    };

    if (this.stroke.totalPointers > this.numPointers) {
      this.fail();
      return;
    }

    this.setTimer(this.maxTime, () => this.fail());
  }

  protected override onPointerDown(event: MotionEvent): void {
    if (!this.stroke) {
      return;
    }
    this.stroke.totalPointers = Math.max(this.stroke.totalPointers + 1, event.pointers.length);
    const p = event.pointers[event.actionIndex];
    if (!p || this.stroke.totalPointers > this.numPointers) {
      this.fail();
      return;
    }
    this.downPositions.set(p.pointerId, p);
    if (event.activePointerCount === this.numPointers) {
      this.stroke.downCenter = event.focus;
      this.stroke.center = event.focus;
      if (
        this.sequence &&
        !isWithinTapSlop(event.focus, this.sequence.lastTap, this.multiTapSlop)
      ) {
        this.fail();
      }
    }
  }

  protected override onMove(event: MotionEvent): void {
    if (!this.stroke) {
      return;
    }
    if (this.exceedsSlop(event)) {
      this.fail();
      return;
    }
    if (event.activePointerCount === this.numPointers) {
      this.stroke.center = event.focus;
    }
  }

  protected override onPointerUp(event: MotionEvent): void {
    if (this.exceedsSlop(event)) {
      this.fail();
    }
  }

  protected override onUp(event: MotionEvent): void {
    this.clearTimer();
    const stroke = this.stroke;
    this.stroke = null;

    // `stroke.downCenter` is only set once all `numPointers` were down simultaneously.
    if (
      !stroke ||
      event.eventTime - stroke.downTime > this.maxTime ||
      stroke.totalPointers !== this.numPointers ||
      !stroke.downCenter ||
      this.exceedsSlop(event)
    ) {
      this.fail();
      return;
    }

    const completedTaps = (this.sequence?.completedTaps ?? 0) + 1;
    if (completedTaps < this.targetTaps) {
      this.sequence = {
        completedTaps,
        lastTap: {
          downFocus: stroke.downCenter,
          upTime: event.eventTime,
          pointerType: event.pointerType,
        },
      };
      this.setTimer(this.multiTapInterval, () => this.fail());
      return;
    }

    const centerOverride = this.numPointers > 1 && stroke.center ? stroke.center : undefined;
    this.clearSequence();
    this.tryRecognizeDiscrete(() => {
      if (this.callbacks.onTap) {
        this.callbacks.onTap(this.createEventData(event, centerOverride));
      }
    });
  }

  protected override onPointerCancel(): void {
    this.clearSequence();
    this.cancel();
  }

  protected override onReset(): void {
    this.downPositions.clear();
    this.stroke = null;
    this.clearSequence();
  }

  protected override onFail(): void {
    this.stroke = null;
    this.clearSequence();
  }

  /** Whether the pointer that triggered `event` wandered beyond `slop` from where it went down. */
  private exceedsSlop(event: MotionEvent): boolean {
    const p = event.pointers[event.actionIndex];
    const start = p ? this.downPositions.get(p.pointerId) : undefined;
    return !!p && !!start && distance(p, start) > this.slop;
  }

  private clearSequence(): void {
    this.clearTimer();
    this.sequence = null;
  }
}

export type TapGestureOptions = Partial<TapOptions> & TapCallbacks;
export type DoubleTapGestureOptions = Partial<Omit<TapOptions, 'taps'>> & TapCallbacks;

/** Creates a tree-shakable `TapRecognizer` descriptor (`taps: 1` by default). */
export function tap(options?: TapGestureOptions): GestureDescriptor {
  return createDescriptor(
    'tap',
    options as Record<string, unknown> | undefined,
    (cbs, cfg) => new TapRecognizer(cbs as TapCallbacks, cfg as Partial<TapOptions>)
  );
}

/** Creates a tree-shakable double-tap (`taps: 2`) `TapRecognizer` descriptor. */
export function doubleTap(options?: DoubleTapGestureOptions): GestureDescriptor {
  return tap({...options, taps: 2});
}
