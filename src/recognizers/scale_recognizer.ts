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
  /** Incremental frame-to-frame scale ratio. */
  readonly scaleFactor: number;
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
  private readonly callbacks: ScaleCallbacks;
  private readonly userOptions: Partial<ScaleOptions>;

  private initialSpan = 0;
  private prevSpan = 0;
  private cumulativeScale = 1;

  constructor(callbacks: ScaleCallbacks, options: Partial<ScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
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
          this.cumulativeScale = 1;

          const started = this.tryBegin(() => {
            this.callbacks.onScaleStart?.(this.buildEvent(event, 1));
          });

          if (started) {
            const postSlopFactor = span / anchorSpan;
            this.cumulativeScale = postSlopFactor;
            if (postSlopFactor !== 1) {
              this.emitChange(() => {
                this.callbacks.onScale?.(this.buildEvent(event, postSlopFactor));
              });
            }
            this.prevSpan = span;
          }
          return;
        }

        // Clamp at `minSpan` while active (matching `RotateRecognizer` and `3->2` re-anchors)
        // so pinching close and spreading back out stays alive without zoom spikes.
        const effectiveSpan = Math.max(1, this.minSpan, span);

        const scaleFactor = effectiveSpan / this.prevSpan;
        if (scaleFactor !== 1) {
          this.cumulativeScale *= scaleFactor;
          this.emitChange(() => {
            this.callbacks.onScale?.(this.buildEvent(event, scaleFactor));
          });
          this.prevSpan = effectiveSpan;
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        if (event.activePointerCount < 2) {
          if (this.active) {
            this.completeActive(() => {
              this.callbacks.onScaleEnd?.(this.buildEvent(event, 1));
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
    this.cumulativeScale = 1;
  }

  private configureMultiPointerSpan(event: MotionEvent): void {
    const span = event.getSpan();
    this.initialSpan = span;
    this.prevSpan = this.active ? Math.max(1, this.minSpan, span) : span;
  }

  private buildEvent(event: MotionEvent, scaleFactor: number): ScaleEventData {
    return {
      ...this.createEventData(event),
      scale: this.cumulativeScale,
      scaleFactor,
      isQuickScale: false,
    };
  }
}
