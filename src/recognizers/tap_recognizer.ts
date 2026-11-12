import {MotionAction, type MotionEvent, type Point} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';
import {DOUBLE_TAP_MIN_TIME_MS} from '../view_configuration.js';

export interface TapOptions {
  /** Required number of consecutive taps (`1` for single-tap, `2` for double-tap, etc.). Default: `1`. */
  taps: number;
  /** Required number of simultaneous pointers per tap. Default: `1`. */
  numPointers: number;
  /** Maximum radial movement in `px` allowed per pointer during a tap. */
  slop: number;
  /** Maximum press duration in `ms` (`down` to `up`) per tap. */
  maxTime: number;
  /** Maximum interval in `ms` allowed between consecutive taps in a multi-tap sequence. */
  multiTapInterval: number;
  /** Maximum distance in `px` between consecutive tap-down locations. */
  multiTapSlop: number;
}

export interface TapEventData extends GestureEventData {
  /** Number of taps completed in this sequence (`1`, `2`, ...). */
  readonly tapCount: number;
}

export interface TapCallbacks {
  /** Fired when the configured `taps` count completes. */
  onTap?: (event: TapEventData) => void;
}

const MAX_DURATION_TIMER = 'maxDuration';
const MULTI_TAP_TIMER = 'multiTap';

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
  private readonly userOptions: Partial<TapOptions>;

  private readonly downPositions = new Map<number, Point>();
  private strokeDownTime = 0;
  private totalPointersInStroke = 0;
  private strokeDownCenter: Point | null = null;
  private strokeCenter: Point | null = null;

  private completedTaps = 0;
  private firstTapDownFocus: Point | null = null;
  private lastTapUpTime = 0;
  private lastTapPointerType = '';

  constructor(callbacks: TapCallbacks, options: Partial<TapOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
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

  private get targetTaps(): number {
    return this.userOptions.taps ?? 1;
  }

  private get numPointers(): number {
    return this.userOptions.numPointers ?? 1;
  }

  private get slop(): number {
    return this.userOptions.slop ?? this.config.touchSlop;
  }

  private get maxTime(): number {
    return this.userOptions.maxTime ?? this.config.maxTapDuration;
  }

  private get multiTapInterval(): number {
    return this.userOptions.multiTapInterval ?? this.config.doubleTapTimeout;
  }

  private get multiTapSlop(): number {
    return this.userOptions.multiTapSlop ?? this.config.doubleTapSlop;
  }

  /** @internal */
  override prepareForDown(event: MotionEvent): void {
    if (this.completedTaps === 0 || !this.firstTapDownFocus) {
      return;
    }

    const dt = event.eventTime - this.lastTapUpTime;
    const minInterval = event.pointerType === 'touch' ? DOUBLE_TAP_MIN_TIME_MS : 0;
    const pointerMismatch =
      this.lastTapPointerType !== '' && event.pointerType !== this.lastTapPointerType;
    const outOfSlop =
      event.activePointerCount >= this.numPointers &&
      Math.hypot(
        event.focus.x - this.firstTapDownFocus.x,
        event.focus.y - this.firstTapDownFocus.y
      ) > this.multiTapSlop;

    if (pointerMismatch || dt < minInterval || dt > this.multiTapInterval || outOfSlop) {
      this.fail();
    } else {
      this.clearTimer(MULTI_TAP_TIMER);
    }
  }

  /** @internal */
  override shouldResetOnDown(event: MotionEvent): boolean {
    if (this.completedTaps > 0) {
      return false;
    }
    return super.shouldResetOnDown(event);
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        this.downPositions.clear();
        for (const p of event.pointers) {
          this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
        }
        this.strokeDownTime = event.eventTime;
        this.totalPointersInStroke = event.pointers.length;
        this.strokeDownCenter = event.activePointerCount === this.numPointers ? event.focus : null;
        this.strokeCenter = this.strokeDownCenter;

        if (this.totalPointersInStroke > this.numPointers) {
          this.fail();
          return;
        }

        this.setTimer(MAX_DURATION_TIMER, this.maxTime, () => this.fail());
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.totalPointersInStroke = Math.max(
          this.totalPointersInStroke + 1,
          event.pointers.length
        );
        if (this.totalPointersInStroke > this.numPointers) {
          this.fail();
          return;
        }
        const p = event.pointers[event.actionIndex];
        this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
        if (event.activePointerCount === this.numPointers) {
          this.strokeDownCenter = event.focus;
          this.strokeCenter = event.focus;
          if (
            this.completedTaps > 0 &&
            this.firstTapDownFocus &&
            Math.hypot(
              event.focus.x - this.firstTapDownFocus.x,
              event.focus.y - this.firstTapDownFocus.y
            ) > this.multiTapSlop
          ) {
            this.fail();
            return;
          }
        }
        break;
      }

      case MotionAction.MOVE: {
        if (this.exceedsSlop(event)) {
          this.fail();
          return;
        }
        if (event.activePointerCount === this.numPointers) {
          this.strokeCenter = event.focus;
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        if (this.exceedsSlop(event)) {
          this.fail();
        }
        break;
      }

      case MotionAction.UP: {
        this.clearTimer(MAX_DURATION_TIMER);

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

        if (this.completedTaps === 0) {
          this.firstTapDownFocus = this.strokeDownCenter;
        }
        this.completedTaps++;
        this.lastTapUpTime = event.eventTime;
        this.lastTapPointerType = event.pointerType;

        const currentTapCount = this.completedTaps;
        if (currentTapCount < this.targetTaps) {
          this.setTimer(MULTI_TAP_TIMER, this.multiTapInterval, () => {
            this.fail();
          });
          return;
        }

        const centerOverride =
          this.numPointers > 1 && this.strokeCenter ? this.strokeCenter : undefined;
        const tapEvent = this.buildTapEvent(event, currentTapCount, centerOverride);
        this.clearMultiTapSequence();
        this.tryRecognizeDiscrete(() => {
          this.callbacks.onTap?.(tapEvent);
        });
        break;
      }

      case MotionAction.CANCEL: {
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
    const start = this.downPositions.get(p.pointerId);
    return !!start && Math.hypot(p.x - start.x, p.y - start.y) > this.slop;
  }

  private clearMultiTapSequence(): void {
    this.clearTimer(MULTI_TAP_TIMER);
    this.completedTaps = 0;
    this.firstTapDownFocus = null;
    this.lastTapUpTime = 0;
    this.lastTapPointerType = '';
  }

  private buildTapEvent(
    event: MotionEvent,
    tapCount: number,
    centerOverride?: Point
  ): TapEventData {
    return {
      ...this.createEventData(event, centerOverride),
      tapCount,
    };
  }
}
