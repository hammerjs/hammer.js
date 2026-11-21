import {distance, type MotionEvent, type Point, ZERO_POINT} from '../motion_event.js';
import {GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';
import type {ScaleCallbacks, ScaleEventData} from './scale_recognizer.js';
import {
  DOUBLE_TAP_SLOP,
  DOUBLE_TAP_TIMEOUT_MS,
  isWithinMultiTapWindow,
  MAX_TAP_DURATION_MS,
} from './tap_recognizer.js';

/** @internal */
export const DEFAULT_QUICK_SCALE_SLOP = 8;
const DEFAULT_SENSITIVITY = 200;

export interface QuickScaleOptions {
  /** Movement distance in `px` required before Quick-Scale begins (and max tap wander on stroke #1). Default: `8`. */
  slop: number;
  /** Vertical drag distance in `px` that doubles (`2x`) or halves (`0.5x`) scale. Default: `200`. */
  sensitivity: number;
}

/**
 * Single-pointer Anchored / Quick-Scale recognizer (double-tap and drag vertically
 * to zoom in/out around the tap anchor, matching Android's `ScaleGestureDetector`
 * Quick-Scale gesture).
 *
 * Phases:
 * - `0`: Evaluating initial tap press (`down` -> `up`).
 * - `1`: First tap completed, waiting within `DOUBLE_TAP_TIMEOUT_MS` for second `down`.
 * - `2`: Armed on second press; vertical drag past `slop` scales around `anchor`.
 */
export class QuickScaleRecognizer extends GestureRecognizer {
  private readonly callbacks: ScaleCallbacks;
  private readonly slop: number;
  private readonly sensitivity: number;

  private phase: 0 | 1 | 2 = 0;
  private tapDown: Point = ZERO_POINT;
  private tapTime = 0;
  private tapPointerType = '';

  private anchor: Point = ZERO_POINT;
  private startY = 0;
  private scale = 1;

  constructor(callbacks: ScaleCallbacks, options: Partial<QuickScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.slop = Math.max(0, options.slop ?? DEFAULT_QUICK_SCALE_SLOP);
    this.sensitivity =
      options.sensitivity !== undefined && options.sensitivity > 0
        ? options.sensitivity
        : DEFAULT_SENSITIVITY;
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  /**
   * Quick-Scale can only claim the arena on the second stroke, so during the first stroke a
   * standalone `Tap` (`!other.suppressesClick`) completing on stroke #1 must not deny it.
   * Non-tap gestures (`Pan`, `LongPress`, `Scale`, `Rotate`) winning on stroke #1 do deny it,
   * and once armed on stroke #2 it follows normal mutual exclusion.
   */
  override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    return this.phase < 2 && !this.active && !other.suppressesClick
      ? true
      : super.canRecognizeSimultaneouslyWith(other);
  }

  /** @internal */
  override get isPrioritized(): boolean {
    return this.phase === 2;
  }

  /** @internal */
  override prepareForDown(event: MotionEvent): void {
    if (this.phase !== 1) {
      return;
    }

    this.clearTimer();
    if (
      event.activePointerCount === 1 &&
      isWithinMultiTapWindow(event, this.tapTime, this.tapPointerType) &&
      distance(event.focus, this.tapDown) <= DOUBLE_TAP_SLOP
    ) {
      this.phase = 2;
      this.anchor = event.focus;
    } else {
      this.phase = 0;
      this.fail();
    }
  }

  /** @internal */
  override shouldResetOnDown(): boolean {
    return this.phase === 2 ? false : super.shouldResetOnDown();
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case 'down': {
        if (event.activePointerCount > 1) {
          this.fail();
          return;
        }
        this.scale = 1;

        if (this.phase !== 2) {
          this.tapDown = event.focus;
          this.tapTime = event.eventTime;
          // A first stroke held longer than a tap can never arm Quick-Scale.
          this.setTimer(MAX_TAP_DURATION_MS, () => this.fail());
        }
        break;
      }

      case 'pointer_down': {
        this.phase = 0;
        if (this.active) {
          this.cancel();
        } else {
          this.fail();
        }
        break;
      }

      case 'move': {
        if (this.phase !== 2) {
          if (distance(event.focus, this.tapDown) > this.slop) {
            this.fail();
          }
          return;
        }

        if (!this.active) {
          const dx = event.focus.x - this.anchor.x;
          const dy = event.focus.y - this.anchor.y;
          if (Math.hypot(dx, dy) <= this.slop) {
            return;
          }

          if (Math.abs(dx) > Math.abs(dy)) {
            this.fail();
            return;
          }

          // Start scaling from the slop boundary on the vertical axis (never past the finger).
          this.startY = this.anchor.y + Math.sign(dy) * Math.min(this.slop, Math.abs(dy));
          this.scale = 1;

          const started = this.tryBegin(() => {
            if (this.callbacks.onScaleStart) {
              this.callbacks.onScaleStart(this.buildEvent(event, 1));
            }
          });
          if (!started) {
            return;
          }
        }

        const nextScale = Math.pow(2, (event.focus.y - this.startY) / this.sensitivity);
        const scaleFactor = nextScale / this.scale;
        if (scaleFactor !== 1) {
          this.scale = nextScale;
          if (this.emitChange() && this.callbacks.onScale) {
            this.callbacks.onScale(this.buildEvent(event, scaleFactor));
          }
        }
        break;
      }

      case 'up': {
        this.clearTimer();

        if (this.phase === 2) {
          this.phase = 0;
          if (this.completeActive()) {
            if (this.callbacks.onScaleEnd) {
              this.callbacks.onScaleEnd(this.buildEvent(event, 1));
            }
          } else {
            this.fail();
          }
          return;
        }

        if (
          event.eventTime - this.tapTime <= MAX_TAP_DURATION_MS &&
          distance(event.focus, this.tapDown) <= this.slop
        ) {
          this.phase = 1;
          this.tapTime = event.eventTime;
          this.tapPointerType = event.pointerType;
          this.setTimer(DOUBLE_TAP_TIMEOUT_MS, () => {
            this.phase = 0;
            this.fail();
          });
        } else {
          this.fail();
        }
        break;
      }

      case 'cancel': {
        this.phase = 0;
        this.cancel();
        break;
      }
    }
  }

  protected override onCancel(): void {
    this.callbacks.onScaleCancel?.();
  }

  protected override onReset(): void {
    this.phase = 0;
    this.tapDown = ZERO_POINT;
    this.tapTime = 0;
    this.tapPointerType = '';
    this.anchor = ZERO_POINT;
    this.startY = 0;
    this.scale = 1;
  }

  protected override onFail(): void {
    this.phase = 0;
  }

  private buildEvent(event: MotionEvent, scaleFactor: number): ScaleEventData {
    return {
      center: this.anchor,
      motionEvent: event,
      originalEvent: event.originalEvent,
      scale: this.scale,
      scaleFactor,
      isQuickScale: true,
    };
  }
}
