import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer, RecognizerState} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';

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
  /**
   * Minimum interval in `ms` between consecutive taps (bounce filter).
   * Defaults to `ViewConfiguration.doubleTapMinTime` (`40ms`) for `'touch'` pointers and `0` for mouse/pen.
   */
  minTapInterval: number;
  /** Maximum distance in `px` between consecutive tap-down locations. */
  multiTapSlop: number;
}

export interface TapEventData extends GestureEventData {
  /** Number of taps completed in this sequence (`1`, `2`, ...). */
  readonly tapCount: number;
}

export interface TapCallbacks {
  /** Fired immediately on `down` (mirrors Android `GestureDetector.onDown`). */
  onDown?: (event: TapEventData) => void;
  /** Fired if pointer stays pressed within `slop` past `ViewConfiguration.tapTimeout` (`onShowPress`). */
  onShowPress?: (event: TapEventData) => void;
  /** Fired when the configured `taps` count completes. */
  onTap?: (event: TapEventData) => void;
}

const SHOW_PRESS_TIMER = 'showPress';
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
  readonly type = 'tap';

  private readonly callbacks: TapCallbacks;
  private readonly userOptions: Partial<TapOptions>;

  private readonly downPositions = new Map<number, Point>();
  private strokeDownTime = 0;
  private maxPointersInStroke = 0;

  private completedTaps = 0;
  private firstTapDownFocus: Point | null = null;
  private lastTapUpTime = 0;

  constructor(callbacks: TapCallbacks, options: Partial<TapOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  override get usesVelocity(): boolean {
    return false;
  }

  override get suppressesClick(): boolean {
    return false;
  }

  private get targetTaps(): number {
    return Math.max(1, this.userOptions.taps ?? 1);
  }

  private get numPointers(): number {
    return this.userOptions.numPointers ?? 1;
  }

  private get slop(): number {
    return this.userOptions.slop ?? this.config.tapSlop;
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

  private resolveMinTapInterval(pointerType: string): number {
    if (this.userOptions.minTapInterval !== undefined) {
      return this.userOptions.minTapInterval;
    }
    return pointerType === 'touch' ? this.config.doubleTapMinTime : 0;
  }

  protected override prepareForDown(event: MotionEvent): void {
    if (this.completedTaps === 0 || !this.firstTapDownFocus) {
      return;
    }

    const dt = event.eventTime - this.lastTapUpTime;
    const minInterval = this.resolveMinTapInterval(event.pointerType);
    const dist = Math.hypot(
      event.focusX - this.firstTapDownFocus.x,
      event.focusY - this.firstTapDownFocus.y
    );

    if (dt < minInterval || dt > this.multiTapInterval || dist > this.multiTapSlop) {
      this.clearMultiTapSequence();
      if (this.state === RecognizerState.POSSIBLE) {
        this.fail();
      }
    } else {
      this.clearTimer(MULTI_TAP_TIMER);
    }
  }

  protected override shouldResetOnDown(_event: MotionEvent): boolean {
    if (this.completedTaps > 0) {
      return false;
    }
    return super.shouldResetOnDown(_event);
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        this.downPositions.clear();
        const p = event.pointers[0];
        if (p) {
          this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
        }
        this.strokeDownTime = event.eventTime;
        this.maxPointersInStroke = event.pointerCount;

        if (this.maxPointersInStroke > this.numPointers) {
          this.clearMultiTapSequence();
          this.fail();
          return;
        }

        const tapNumber = this.completedTaps + 1;
        if (this.callbacks.onDown) {
          this.callbacks.onDown(this.buildTapEvent(event, tapNumber));
        }

        if (this.callbacks.onShowPress && this.numPointers === 1) {
          this.setTimer(SHOW_PRESS_TIMER, this.config.tapTimeout, () => {
            if (this.state === RecognizerState.POSSIBLE) {
              this.callbacks.onShowPress?.(this.buildTapEvent(event, tapNumber));
            }
          });
        }

        this.setTimer(MAX_DURATION_TIMER, this.maxTime, () => {
          if (this.state === RecognizerState.POSSIBLE) {
            this.clearMultiTapSequence();
            this.fail();
          }
        });
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.clearTimer(SHOW_PRESS_TIMER);
        this.maxPointersInStroke = Math.max(this.maxPointersInStroke, event.pointerCount);
        if (this.maxPointersInStroke > this.numPointers) {
          this.clearMultiTapSequence();
          this.fail();
          return;
        }
        const p = event.pointers[event.actionIndex];
        if (p) {
          this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
        }
        break;
      }

      case MotionAction.MOVE: {
        const moved = event.pointers[event.actionIndex];
        if (!moved) break;
        const start = this.downPositions.get(moved.pointerId);
        if (start && Math.hypot(moved.x - start.x, moved.y - start.y) > this.slop) {
          this.clearMultiTapSequence();
          this.fail();
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        const lifted = event.pointers[event.actionIndex];
        if (lifted) {
          const start = this.downPositions.get(lifted.pointerId);
          if (start && Math.hypot(lifted.x - start.x, lifted.y - start.y) > this.slop) {
            this.clearMultiTapSequence();
            this.fail();
          }
        }
        break;
      }

      case MotionAction.UP: {
        this.clearTimer(SHOW_PRESS_TIMER);
        this.clearTimer(MAX_DURATION_TIMER);

        const duration = event.eventTime - this.strokeDownTime;
        if (duration > this.maxTime || this.maxPointersInStroke !== this.numPointers) {
          this.clearMultiTapSequence();
          this.fail();
          return;
        }

        const lifted = event.pointers[event.actionIndex] ?? event.pointers[0];
        if (lifted) {
          const start = this.downPositions.get(lifted.pointerId);
          if (start && Math.hypot(lifted.x - start.x, lifted.y - start.y) > this.slop) {
            this.clearMultiTapSequence();
            this.fail();
            return;
          }
        }

        if (this.completedTaps === 0) {
          const firstStart = lifted ? this.downPositions.get(lifted.pointerId) : null;
          this.firstTapDownFocus = firstStart ?? event.focus;
        }
        this.completedTaps++;
        this.lastTapUpTime = event.eventTime;

        const currentTapCount = this.completedTaps;
        if (currentTapCount < this.targetTaps) {
          this.setTimer(MULTI_TAP_TIMER, this.multiTapInterval, () => {
            this.clearMultiTapSequence();
            this.fail();
          });
          return;
        }

        const tapEvent = this.buildTapEvent(event, currentTapCount);
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
    this.maxPointersInStroke = 0;
    this.clearMultiTapSequence();
  }

  protected override onFail(): void {
    this.clearMultiTapSequence();
  }

  private clearMultiTapSequence(): void {
    this.clearTimer(MULTI_TAP_TIMER);
    this.completedTaps = 0;
    this.firstTapDownFocus = null;
    this.lastTapUpTime = 0;
  }

  private buildTapEvent(event: MotionEvent, tapCount: number): TapEventData {
    return {
      ...this.createEventData(event),
      tapCount,
    };
  }
}
