import {MotionAction, type MotionEvent} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';

export interface ScaleOptions {
  /** Span change in `px` required before multi-pointer scaling begins. */
  spanSlop: number;
  /** Minimum pointer span in `px` required for multi-touch scaling. */
  minSpan: number;
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
  /** `true` when scaling via single-pointer `QuickScaleRecognizer`. */
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

  private callbacks: ScaleCallbacks;
  private readonly userOptions: Partial<ScaleOptions>;

  private initialSpan = 0;
  private prevSpan = 0;
  private currSpan = 0;
  private prevTime = 0;
  private cumulativeScale = 1;

  constructor(callbacks: ScaleCallbacks, options: Partial<ScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  setCallbacks(callbacks: ScaleCallbacks): this {
    this.callbacks = callbacks;
    return this;
  }

  override getTouchAction(): TouchActionValue {
    return 'pan-x pan-y';
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return true;
  }

  private get spanSlop(): number {
    return this.userOptions.spanSlop ?? this.config.spanSlop;
  }

  private get minSpan(): number {
    return this.userOptions.minSpan ?? this.config.minScalingSpan;
  }

  /** @internal */
  override canRearmOnPointerDown(event: MotionEvent): boolean {
    return event.activePointerCount >= 2;
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        this.prevTime = event.eventTime;
        this.cumulativeScale = 1;
        if (event.activePointerCount >= 2) {
          this.configureMultiPointerSpan(event);
        }
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.configureMultiPointerSpan(event);
        break;
      }

      case MotionAction.MOVE: {
        if (event.activePointerCount < 2) {
          return;
        }

        const span = event.getSpan();
        const timeDelta = Math.max(0, event.eventTime - this.prevTime);

        if (!this.active) {
          if (span < this.minSpan) {
            this.initialSpan = span;
            return;
          }
          const baseSpan = Math.max(this.minSpan, this.initialSpan);
          const spanDelta = span - baseSpan;
          if (Math.abs(spanDelta) <= this.spanSlop) {
            return;
          }

          const anchorSpan = Math.max(
            1,
            this.minSpan,
            baseSpan + Math.sign(spanDelta) * this.spanSlop
          );
          this.prevSpan = anchorSpan;
          this.currSpan = anchorSpan;
          this.cumulativeScale = 1;

          const started = this.tryBegin(() => {
            this.callbacks.onScaleStart?.(this.buildEvent(event, 1, 0));
          });

          if (started) {
            this.currSpan = span;
            const postSlopFactor = span / anchorSpan;
            this.cumulativeScale = postSlopFactor;
            if (postSlopFactor !== 1) {
              this.emitChange(() => {
                this.callbacks.onScale?.(this.buildEvent(event, postSlopFactor, timeDelta));
              });
            }
            this.prevSpan = span;
            this.prevTime = event.eventTime;
          }
          return;
        }

        // Clamp at `minSpan` while active (matching `RotateRecognizer` and `3->2` re-anchors)
        // so pinching close and spreading back out stays alive without zoom spikes.
        const effectiveSpan = Math.max(1, this.minSpan, span);
        this.currSpan = effectiveSpan;

        const scaleFactor = effectiveSpan / this.prevSpan;
        if (scaleFactor !== 1) {
          this.cumulativeScale *= scaleFactor;
          this.emitChange(() => {
            this.callbacks.onScale?.(this.buildEvent(event, scaleFactor, timeDelta));
          });
          this.prevSpan = effectiveSpan;
          this.prevTime = event.eventTime;
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        if (event.activePointerCount < 2) {
          if (this.active) {
            this.finish(event);
          } else {
            this.fail();
          }
          return;
        }
        this.configureMultiPointerSpan(event);
        break;
      }

      case MotionAction.UP: {
        // An active scale always ends on the preceding `POINTER_UP` (fewer than 2 pointers).
        this.fail();
        break;
      }

      case MotionAction.CANCEL: {
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
  }

  private finish(event: MotionEvent): void {
    const timeDelta = Math.max(0, event.eventTime - this.prevTime);
    this.completeActive(() => {
      this.callbacks.onScaleEnd?.(this.buildEvent(event, 1, timeDelta));
    });
  }

  private configureMultiPointerSpan(event: MotionEvent): void {
    const span = event.getSpan();
    this.initialSpan = span;
    this.prevSpan = this.active ? Math.max(1, this.minSpan, span) : span;
    this.currSpan = span;
    this.prevTime = event.eventTime;
  }

  private buildEvent(event: MotionEvent, scaleFactor: number, timeDelta: number): ScaleEventData {
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
}
