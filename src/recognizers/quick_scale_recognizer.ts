import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';
import type {ScaleCallbacks, ScaleEventData} from './scale_recognizer';

const QUICK_SCALE_BASE_SPAN = 100;
const MAX_TAP_TIMER = 'maxTap';
const MULTI_TAP_TIMER = 'multiTap';

export interface QuickScaleOptions {
  /** Movement distance in `px` on the second press required before Quick-Scale begins. */
  slop: number;
  /** Vertical drag distance in `px` that doubles (`2x`) or halves (`0.5x`) scale. Default: `200`. */
  sensitivity: number;
}

/**
 * Single-pointer Anchored / Quick-Scale recognizer (double-tap and drag vertically
 * to zoom in/out around the tap anchor, matching Android's `ScaleGestureDetector`
 * Quick-Scale gesture).
 */
export class QuickScaleRecognizer extends GestureRecognizer {
  readonly type = 'quickScale';

  private readonly callbacks: ScaleCallbacks;
  private readonly userOptions: Partial<QuickScaleOptions>;

  private tapDownX = 0;
  private tapDownY = 0;
  private tapDownTime = 0;

  private firstTapDownFocus: Point | null = null;
  private lastTapUpTime = 0;
  private lastTapPointerType = '';

  private quickScaleCandidate = false;
  private anchor: Point = {x: 0, y: 0};
  private startY = 0;
  private prevScale = 1;
  private cumulativeScale = 1;
  private prevTime = 0;

  constructor(callbacks: ScaleCallbacks, options: Partial<QuickScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  /**
   * Quick-Scale can only claim the arena on the second stroke, so during the first stroke it
   * never competes: a `Tap` (or any other recognizer) completing on stroke #1 must not deny it.
   * Once armed on stroke #2 it follows normal mutual exclusion.
   */
  override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    if (!this.quickScaleCandidate && !this.active) {
      return true;
    }
    return super.canRecognizeSimultaneouslyWith(other);
  }

  /** @internal */
  override get isPrioritized(): boolean {
    return this.quickScaleCandidate;
  }

  private get slop(): number {
    return this.userOptions.slop ?? this.config.touchSlop;
  }

  private get sensitivity(): number {
    return this.userOptions.sensitivity ?? 200;
  }

  /** @internal */
  override prepareForDown(event: MotionEvent): void {
    if (!this.firstTapDownFocus) {
      return;
    }

    const dt = event.eventTime - this.lastTapUpTime;
    const minDt = event.pointerType === 'touch' ? this.config.doubleTapMinTime : 0;
    const pointerMismatch =
      this.lastTapPointerType !== '' && event.pointerType !== this.lastTapPointerType;
    const dist = Math.hypot(
      event.focusX - this.firstTapDownFocus.x,
      event.focusY - this.firstTapDownFocus.y
    );

    this.clearMultiTapSequence();
    if (
      event.activePointerCount === 1 &&
      !pointerMismatch &&
      dt >= minDt &&
      dt <= this.config.doubleTapTimeout &&
      dist <= this.config.doubleTapSlop
    ) {
      this.quickScaleCandidate = true;
      this.anchor = event.focus;
    } else {
      this.fail();
    }
  }

  /** @internal */
  override shouldResetOnDown(event: MotionEvent): boolean {
    if (this.quickScaleCandidate) {
      return false;
    }
    return super.shouldResetOnDown(event);
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        if (event.activePointerCount > 1) {
          this.fail();
          return;
        }
        this.prevTime = event.eventTime;
        this.prevScale = 1;
        this.cumulativeScale = 1;

        if (!this.quickScaleCandidate) {
          this.tapDownX = event.focusX;
          this.tapDownY = event.focusY;
          this.tapDownTime = event.eventTime;
          // A first stroke held longer than a tap can never arm Quick-Scale.
          this.setTimer(MAX_TAP_TIMER, this.config.maxTapDuration, () => this.fail());
        }
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.clearMultiTapSequence();
        this.quickScaleCandidate = false;
        if (this.active) {
          this.cancel();
        } else {
          this.fail();
        }
        break;
      }

      case MotionAction.MOVE: {
        if (!this.quickScaleCandidate) {
          if (
            Math.hypot(event.focusX - this.tapDownX, event.focusY - this.tapDownY) >
            this.config.tapSlop
          ) {
            this.fail();
          }
          return;
        }

        const dx = event.focusX - this.anchor.x;
        const dy = event.focusY - this.anchor.y;
        const timeDelta = Math.max(0, event.eventTime - this.prevTime);
        const slop = this.slop;

        if (!this.active) {
          if (Math.hypot(dx, dy) <= slop) {
            return;
          }

          if (Math.abs(dx) > Math.abs(dy)) {
            this.fail();
            return;
          }

          // Start scaling from the slop boundary on the vertical axis (never past the finger).
          this.startY = this.anchor.y + Math.sign(dy) * Math.min(slop, Math.abs(dy));
          this.prevScale = 1;
          this.cumulativeScale = 1;

          const started = this.tryBegin(() => {
            this.callbacks.onScaleStart?.(this.buildEvent(event, 1, 0));
          });

          if (started) {
            const nextScale = Math.pow(2, (event.focusY - this.startY) / this.sensitivity);
            const factor = nextScale / this.prevScale;
            this.cumulativeScale = nextScale;
            if (factor !== 1) {
              this.emitChange(() => {
                this.callbacks.onScale?.(this.buildEvent(event, factor, timeDelta));
              });
            }
            this.prevScale = nextScale;
            this.prevTime = event.eventTime;
          }
          return;
        }

        const nextScale = Math.pow(2, (event.focusY - this.startY) / this.sensitivity);
        const scaleFactor = nextScale / this.prevScale;
        if (scaleFactor !== 1) {
          this.cumulativeScale = nextScale;
          this.emitChange(() => {
            this.callbacks.onScale?.(this.buildEvent(event, scaleFactor, timeDelta));
          });
          this.prevScale = nextScale;
          this.prevTime = event.eventTime;
        }
        break;
      }

      case MotionAction.UP: {
        this.clearTimer(MAX_TAP_TIMER);

        if (this.quickScaleCandidate) {
          this.quickScaleCandidate = false;
          if (this.active) {
            const timeDelta = Math.max(0, event.eventTime - this.prevTime);
            this.completeActive(() => {
              this.callbacks.onScaleEnd?.(this.buildEvent(event, 1, timeDelta));
            });
            return;
          }
          this.fail();
          return;
        }

        const duration = event.eventTime - this.tapDownTime;
        const withinSlop =
          Math.hypot(event.focusX - this.tapDownX, event.focusY - this.tapDownY) <=
          this.config.tapSlop;
        if (duration <= this.config.maxTapDuration && withinSlop) {
          this.firstTapDownFocus = {x: this.tapDownX, y: this.tapDownY};
          this.lastTapUpTime = event.eventTime;
          this.lastTapPointerType = event.pointerType;
          this.setTimer(MULTI_TAP_TIMER, this.config.doubleTapTimeout, () => {
            this.clearMultiTapSequence();
            this.fail();
          });
        } else {
          this.fail();
        }
        break;
      }

      case MotionAction.CANCEL: {
        this.clearMultiTapSequence();
        this.quickScaleCandidate = false;
        this.cancel();
        break;
      }
    }
  }

  protected override onCancel(): void {
    this.callbacks.onScaleCancel?.();
  }

  protected override onReset(): void {
    this.clearMultiTapSequence();
    this.quickScaleCandidate = false;
    this.tapDownX = 0;
    this.tapDownY = 0;
    this.tapDownTime = 0;
    this.anchor = {x: 0, y: 0};
    this.startY = 0;
    this.prevScale = 1;
    this.cumulativeScale = 1;
    this.prevTime = 0;
  }

  protected override onFail(): void {
    this.clearMultiTapSequence();
    this.quickScaleCandidate = false;
  }

  private clearMultiTapSequence(): void {
    this.clearTimer(MULTI_TAP_TIMER);
    this.firstTapDownFocus = null;
    this.lastTapUpTime = 0;
    this.lastTapPointerType = '';
  }

  private buildEvent(event: MotionEvent, scaleFactor: number, timeDelta: number): ScaleEventData {
    const currentSpan = QUICK_SCALE_BASE_SPAN * this.cumulativeScale;
    const previousSpan = currentSpan / scaleFactor;
    return {
      ...this.createEventData(event, this.anchor),
      scale: this.cumulativeScale,
      scaleFactor,
      currentSpan,
      previousSpan,
      currentSpanX: 0,
      currentSpanY: currentSpan,
      timeDelta,
      isQuickScale: true,
    };
  }
}
