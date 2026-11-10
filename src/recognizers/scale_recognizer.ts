import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';
import {RotateRecognizer} from './rotate_recognizer';

const QUICK_SCALE_BASE_SPAN = 100;

interface QuickTapRecord {
  readonly downX: number;
  readonly downY: number;
  readonly upTime: number;
}

export interface ScaleOptions {
  /** Span change in `px` required before multi-pointer scaling begins. */
  spanSlop: number;
  /** Minimum pointer span in `px` required for multi-touch scaling. */
  minSpan: number;
  /**
   * Enable Android Quick-Scale (Anchored Scale): double-tap and drag vertically
   * with a single pointer to zoom in/out around the anchor point. Default: `false`.
   */
  quickScale: boolean;
  /** Vertical drag distance in `px` that doubles (`2x`) or halves (`0.5x`) scale in Quick-Scale. Default: `200`. */
  quickScaleSensitivity: number;
  /** Recognize simultaneously with `RotateRecognizer` by default. Default: `true`. */
  simultaneousWithRotate: boolean;
}

export interface ScaleEventData extends GestureEventData {
  /** Cumulative post-slop scale ratio relative to gesture start (`1.0` = original size). */
  readonly scale: number;
  /** Incremental frame-to-frame scale ratio (`currentSpan / previousSpan`). */
  readonly scaleFactor: number;
  /** Current multi-pointer (or Quick-Scale virtual) span in `px`. */
  readonly currentSpan: number;
  /** Previous frame's multi-pointer (or Quick-Scale virtual) span in `px`. */
  readonly previousSpan: number;
  /** Current horizontal span component in `px`. */
  readonly currentSpanX: number;
  /** Current vertical span component in `px`. */
  readonly currentSpanY: number;
  /** Elapsed time in `ms` since the previous scale frame. */
  readonly timeDelta: number;
  /** `true` when scaling via single-pointer double-tap-and-drag Quick-Scale. */
  readonly isQuickScale: boolean;
}

export interface ScaleCallbacks {
  onScaleStart?: (data: ScaleEventData) => void;
  onScale?: (data: ScaleEventData) => void;
  onScaleEnd?: (data: ScaleEventData) => void;
  onScaleCancel?: () => void;
}

export class ScaleRecognizer extends GestureRecognizer {
  readonly type = 'scale';

  private readonly callbacks: ScaleCallbacks;
  private readonly userOptions: Partial<ScaleOptions>;

  private initialSpan = 0;
  private prevSpan = 0;
  private currSpan = 0;
  private prevTime = 0;
  private cumulativeScale = 1;

  // Self-contained Quick-Scale (double-tap + drag) state:
  private lastQuickTap: QuickTapRecord | null = null;
  private tapEligible = false;
  private tapDownX = 0;
  private tapDownY = 0;
  private tapDownTime = 0;

  private quickScaleCandidate = false;
  private inQuickScale = false;
  private quickAnchor: Point = {x: 0, y: 0};
  private quickStartY = 0;
  private quickPrevScale = 1;

  constructor(callbacks: ScaleCallbacks, options: Partial<ScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  override getTouchAction(): TouchActionValue {
    return 'pan-x pan-y';
  }

  override get usesVelocity(): boolean {
    return false;
  }

  get simultaneousWithRotate(): boolean {
    return this.userOptions.simultaneousWithRotate ?? true;
  }

  private get spanSlop(): number {
    return this.userOptions.spanSlop ?? this.config.spanSlop;
  }

  private get minSpan(): number {
    return this.userOptions.minSpan ?? this.config.minScalingSpan;
  }

  private get quickScaleEnabled(): boolean {
    return this.userOptions.quickScale ?? false;
  }

  private get quickScaleSensitivity(): number {
    return Math.max(1, this.userOptions.quickScaleSensitivity ?? 200);
  }

  protected override get isPrioritized(): boolean {
    return this.quickScaleCandidate;
  }

  override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    if (other instanceof RotateRecognizer) {
      if (this.simultaneousWithRotate && other.simultaneousWithScale) {
        return true;
      }
    }
    return super.canRecognizeSimultaneouslyWith(other);
  }

  protected override canRearmOnPointerDown(event: MotionEvent): boolean {
    return event.activePointerCount >= 2;
  }

  protected override prepareForDown(event: MotionEvent): void {
    const prevTap = this.lastQuickTap;
    this.lastQuickTap = null;

    if (!this.quickScaleEnabled || !prevTap || event.activePointerCount !== 1) {
      this.quickScaleCandidate = false;
      return;
    }

    const dt = event.eventTime - prevTap.upTime;
    const minDt = event.pointerType === 'touch' ? this.config.doubleTapMinTime : 0;
    const dist = Math.hypot(event.focusX - prevTap.downX, event.focusY - prevTap.downY);

    if (dt >= minDt && dt <= this.config.doubleTapTimeout && dist <= this.config.doubleTapSlop) {
      this.quickScaleCandidate = true;
      this.quickAnchor = event.focus;
    } else {
      this.quickScaleCandidate = false;
    }
  }

  protected override observeStreamEvent(event: MotionEvent): void {
    if (!this.quickScaleEnabled) {
      return;
    }
    switch (event.action) {
      case MotionAction.DOWN: {
        // Only record a potential first tap if this stroke is NOT already Stroke #2 of Quick-Scale.
        this.tapEligible = !this.quickScaleCandidate && event.activePointerCount === 1;
        this.tapDownX = event.focusX;
        this.tapDownY = event.focusY;
        this.tapDownTime = event.eventTime;
        break;
      }
      case MotionAction.POINTER_DOWN: {
        this.tapEligible = false;
        break;
      }
      case MotionAction.MOVE: {
        if (
          this.tapEligible &&
          Math.hypot(event.focusX - this.tapDownX, event.focusY - this.tapDownY) >
            this.config.tapSlop
        ) {
          this.tapEligible = false;
        }
        break;
      }
      case MotionAction.UP: {
        const duration = event.eventTime - this.tapDownTime;
        const withinSlop =
          Math.hypot(event.focusX - this.tapDownX, event.focusY - this.tapDownY) <=
          this.config.tapSlop;
        if (
          this.tapEligible &&
          withinSlop &&
          duration >= 0 &&
          duration <= this.config.maxTapDuration
        ) {
          this.lastQuickTap = {
            downX: this.tapDownX,
            downY: this.tapDownY,
            upTime: event.eventTime,
          };
        } else {
          this.lastQuickTap = null;
        }
        this.tapEligible = false;
        break;
      }
      case MotionAction.CANCEL: {
        this.tapEligible = false;
        this.lastQuickTap = null;
        break;
      }
      default:
        break;
    }
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        this.prevTime = event.eventTime;
        this.cumulativeScale = 1;
        this.inQuickScale = false;
        this.quickPrevScale = 1;

        if (event.activePointerCount >= 2) {
          this.quickScaleCandidate = false;
          this.configureMultiPointerSpan(event);
        }
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.quickScaleCandidate = false;
        if (this.inQuickScale) {
          this.cancel();
          return;
        }
        this.configureMultiPointerSpan(event);
        break;
      }

      case MotionAction.MOVE: {
        if (this.quickScaleCandidate && event.activePointerCount === 1) {
          this.handleQuickScaleMove(event);
          return;
        }

        if (event.activePointerCount < 2) {
          return;
        }

        const span = event.getSpan();
        const timeDelta = Math.max(0, event.eventTime - this.prevTime);

        if (!this.active) {
          const spanDelta = span - this.initialSpan;
          if (span < this.minSpan || Math.abs(spanDelta) <= this.spanSlop) {
            return;
          }

          const anchorSpan = Math.max(1, this.initialSpan + Math.sign(spanDelta) * this.spanSlop);
          this.prevSpan = anchorSpan;
          this.currSpan = anchorSpan;
          this.cumulativeScale = 1;

          const started = this.tryBegin(() => {
            this.callbacks.onScaleStart?.(this.buildMultiPointerEvent(event, 1, 0));
          });

          if (started) {
            this.currSpan = span;
            const postSlopFactor = span / anchorSpan;
            this.cumulativeScale = postSlopFactor;
            if (postSlopFactor !== 1 && this.callbacks.onScale) {
              this.emitChange(() => {
                this.callbacks.onScale?.(
                  this.buildMultiPointerEvent(event, postSlopFactor, timeDelta)
                );
              });
            }
            this.prevSpan = span;
            this.prevTime = event.eventTime;
          }
          return;
        }

        this.currSpan = span;
        if (span < this.minSpan) {
          const endPayload = this.buildMultiPointerEvent(event, 1, timeDelta);
          this.completeActive(() => {
            this.callbacks.onScaleEnd?.(endPayload);
          });
          return;
        }

        const scaleFactor = this.prevSpan > 0 ? span / this.prevSpan : 1;
        if (scaleFactor !== 1) {
          this.cumulativeScale *= scaleFactor;
          this.emitChange(() => {
            this.callbacks.onScale?.(this.buildMultiPointerEvent(event, scaleFactor, timeDelta));
          });
          this.prevSpan = span;
          this.prevTime = event.eventTime;
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        if (event.activePointerCount < 2) {
          if (this.active) {
            const timeDelta = Math.max(0, event.eventTime - this.prevTime);
            const endPayload = this.buildMultiPointerEvent(event, 1, timeDelta);
            this.completeActive(() => {
              this.callbacks.onScaleEnd?.(endPayload);
            });
          } else {
            this.fail();
          }
          return;
        }
        this.configureMultiPointerSpan(event);
        break;
      }

      case MotionAction.UP: {
        this.quickScaleCandidate = false;
        if (this.active) {
          const timeDelta = Math.max(0, event.eventTime - this.prevTime);
          const payload = this.inQuickScale
            ? this.buildQuickScaleEvent(event, 1, timeDelta)
            : this.buildMultiPointerEvent(event, 1, timeDelta);
          this.completeActive(() => {
            this.callbacks.onScaleEnd?.(payload);
          });
          return;
        }
        this.fail();
        break;
      }

      case MotionAction.CANCEL: {
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
    this.initialSpan = 0;
    this.prevSpan = 0;
    this.currSpan = 0;
    this.prevTime = 0;
    this.cumulativeScale = 1;
    this.inQuickScale = false;
    this.quickStartY = 0;
    this.quickPrevScale = 1;
  }

  protected override onFail(): void {
    this.quickScaleCandidate = false;
  }

  private configureMultiPointerSpan(event: MotionEvent): void {
    const span = event.getSpan();
    this.initialSpan = span;
    this.prevSpan = span;
    this.currSpan = span;
    this.prevTime = event.eventTime;
  }

  private handleQuickScaleMove(event: MotionEvent): void {
    const dxFromAnchor = event.focusX - this.quickAnchor.x;
    const dyFromAnchor = event.focusY - this.quickAnchor.y;
    const timeDelta = Math.max(0, event.eventTime - this.prevTime);
    const quickSlop = Math.min(this.spanSlop, this.config.touchSlop);

    if (!this.active) {
      if (Math.hypot(dxFromAnchor, dyFromAnchor) <= quickSlop) {
        return;
      }

      if (Math.abs(dxFromAnchor) > Math.abs(dyFromAnchor)) {
        this.quickScaleCandidate = false;
        return;
      }

      this.inQuickScale = true;
      this.quickStartY = this.quickAnchor.y + Math.sign(dyFromAnchor) * quickSlop;
      this.quickPrevScale = 1;
      this.cumulativeScale = 1;

      const started = this.tryBegin(() => {
        this.callbacks.onScaleStart?.(this.buildQuickScaleEvent(event, 1, 0));
      });

      if (started) {
        const nextScale = Math.pow(
          2,
          (event.focusY - this.quickStartY) / this.quickScaleSensitivity
        );
        const factor = nextScale / this.quickPrevScale;
        this.cumulativeScale = nextScale;
        if (factor !== 1 && this.callbacks.onScale) {
          this.emitChange(() => {
            this.callbacks.onScale?.(this.buildQuickScaleEvent(event, factor, timeDelta));
          });
        }
        this.quickPrevScale = nextScale;
        this.prevTime = event.eventTime;
      }
      return;
    }

    const nextScale = Math.pow(2, (event.focusY - this.quickStartY) / this.quickScaleSensitivity);
    const scaleFactor = nextScale / this.quickPrevScale;
    if (scaleFactor !== 1) {
      this.cumulativeScale = nextScale;
      this.emitChange(() => {
        this.callbacks.onScale?.(this.buildQuickScaleEvent(event, scaleFactor, timeDelta));
      });
      this.quickPrevScale = nextScale;
      this.prevTime = event.eventTime;
    }
  }

  private buildMultiPointerEvent(
    event: MotionEvent,
    scaleFactor: number,
    timeDelta: number
  ): ScaleEventData {
    return {
      ...this.createEventData(event),
      scale: this.cumulativeScale,
      scaleFactor,
      currentSpan: this.currSpan,
      previousSpan: this.prevSpan,
      currentSpanX: event.getSpanX(),
      currentSpanY: event.getSpanY(),
      timeDelta,
      isQuickScale: false,
    };
  }

  private buildQuickScaleEvent(
    event: MotionEvent,
    scaleFactor: number,
    timeDelta: number
  ): ScaleEventData {
    const currentSpan = QUICK_SCALE_BASE_SPAN * this.cumulativeScale;
    const previousSpan = scaleFactor > 0 ? currentSpan / scaleFactor : currentSpan;
    return {
      ...this.createEventData(event, this.quickAnchor),
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
