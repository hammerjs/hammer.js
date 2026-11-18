import {distance, type MotionEvent, type Point} from '../motion_event.js';
import {
  DOUBLE_TAP_MIN_TIME_MS,
  DOUBLE_TAP_SLOP,
  DOUBLE_TAP_TIMEOUT_MS,
  type GestureEventData,
  GestureRecognizer,
  MAX_TAP_DURATION_MS,
  TOUCH_SLOP,
} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';

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
  private strokeDownTime = 0;
  private totalPointersInStroke = 0;
  private strokeDownCenter: Point | null = null;
  private strokeCenter: Point | null = null;

  private completedTaps = 0;
  private lastTapDownFocus: Point | null = null;
  private lastTapUpTime = 0;
  private lastTapPointerType = '';

  constructor(callbacks: TapCallbacks, options: Partial<TapOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.targetTaps = options.taps ?? 1;
    this.numPointers = options.numPointers ?? 1;
    this.slop = Math.max(0, options.slop ?? TOUCH_SLOP);
    this.maxTime = options.maxTime ?? MAX_TAP_DURATION_MS;
    this.multiTapInterval = options.multiTapInterval ?? DOUBLE_TAP_TIMEOUT_MS;
    this.multiTapSlop = Math.max(0, options.multiTapSlop ?? DOUBLE_TAP_SLOP);
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  override get suppressesClick(): boolean {
    return false;
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return this.numPointers >= 2;
  }

  /** @internal */
  override prepareForDown(event: MotionEvent): void {
    if (this.completedTaps === 0 || !this.lastTapDownFocus) {
      return;
    }

    const dt = event.eventTime - this.lastTapUpTime;
    const minInterval = event.pointerType === 'touch' ? DOUBLE_TAP_MIN_TIME_MS : 0;
    const pointerMismatch =
      this.lastTapPointerType !== '' && event.pointerType !== this.lastTapPointerType;
    const outOfSlop =
      event.activePointerCount >= this.numPointers &&
      distance(event.focus, this.lastTapDownFocus) > this.multiTapSlop;

    if (pointerMismatch || dt < minInterval || dt > this.multiTapInterval || outOfSlop) {
      this.fail();
    } else {
      this.clearTimer();
    }
  }

  /** @internal */
  override shouldResetOnDown(event: MotionEvent): boolean {
    return this.completedTaps > 0 ? false : super.shouldResetOnDown(event);
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case 'down': {
        this.downPositions.clear();
        for (const p of event.pointers) {
          this.downPositions.set(p.pointerId, p);
        }
        this.strokeDownTime = event.eventTime;
        this.totalPointersInStroke = event.pointers.length;
        this.strokeDownCenter = event.activePointerCount === this.numPointers ? event.focus : null;
        this.strokeCenter = this.strokeDownCenter;

        if (this.totalPointersInStroke > this.numPointers) {
          this.fail();
          return;
        }

        this.setTimer(this.maxTime, () => this.fail());
        break;
      }

      case 'pointer_down': {
        this.totalPointersInStroke = Math.max(
          this.totalPointersInStroke + 1,
          event.pointers.length
        );
        const p = event.pointers[event.actionIndex];
        if (!p || this.totalPointersInStroke > this.numPointers) {
          this.fail();
          return;
        }
        this.downPositions.set(p.pointerId, p);
        if (event.activePointerCount === this.numPointers) {
          this.strokeDownCenter = event.focus;
          this.strokeCenter = event.focus;
          if (
            this.completedTaps > 0 &&
            this.lastTapDownFocus &&
            distance(event.focus, this.lastTapDownFocus) > this.multiTapSlop
          ) {
            this.fail();
            return;
          }
        }
        break;
      }

      case 'move': {
        if (this.exceedsSlop(event)) {
          this.fail();
          return;
        }
        if (event.activePointerCount === this.numPointers) {
          this.strokeCenter = event.focus;
        }
        break;
      }

      case 'pointer_up': {
        if (this.exceedsSlop(event)) {
          this.fail();
        }
        break;
      }

      case 'up': {
        this.clearTimer();

        // `strokeDownCenter` is only set once all `numPointers` were down simultaneously.
        const duration = event.eventTime - this.strokeDownTime;
        if (
          duration > this.maxTime ||
          this.totalPointersInStroke !== this.numPointers ||
          !this.strokeDownCenter ||
          this.exceedsSlop(event)
        ) {
          this.fail();
          return;
        }

        this.lastTapDownFocus = this.strokeDownCenter;
        this.completedTaps++;
        this.lastTapUpTime = event.eventTime;
        this.lastTapPointerType = event.pointerType;

        if (this.completedTaps < this.targetTaps) {
          this.setTimer(this.multiTapInterval, () => this.fail());
          return;
        }

        const centerOverride =
          this.numPointers > 1 && this.strokeCenter ? this.strokeCenter : undefined;
        this.clearMultiTapSequence();
        this.tryRecognizeDiscrete(() => {
          if (this.callbacks.onTap) {
            this.callbacks.onTap(this.createEventData(event, centerOverride));
          }
        });
        break;
      }

      case 'cancel': {
        this.clearMultiTapSequence();
        this.cancel();
        break;
      }
    }
  }

  protected override onReset(): void {
    this.downPositions.clear();
    this.strokeDownTime = 0;
    this.totalPointersInStroke = 0;
    this.strokeDownCenter = null;
    this.strokeCenter = null;
    this.clearMultiTapSequence();
  }

  protected override onFail(): void {
    this.clearMultiTapSequence();
  }

  /** Whether the pointer that triggered `event` wandered beyond `slop` from where it went down. */
  private exceedsSlop(event: MotionEvent): boolean {
    const p = event.pointers[event.actionIndex];
    const start = p ? this.downPositions.get(p.pointerId) : undefined;
    return !!p && !!start && distance(p, start) > this.slop;
  }

  private clearMultiTapSequence(): void {
    this.clearTimer();
    this.completedTaps = 0;
    this.lastTapDownFocus = null;
    this.lastTapUpTime = 0;
    this.lastTapPointerType = '';
  }
}
