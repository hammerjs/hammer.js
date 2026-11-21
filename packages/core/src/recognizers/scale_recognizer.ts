import {centroid, type MotionEvent, type Point} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';

const DEFAULT_SPAN_SLOP = 16;
const DEFAULT_MIN_SPAN = 27;

export interface ScaleOptions {
  /** Span change in `px` required before multi-pointer scaling begins. Default: `16`. */
  spanSlop: number;
  /** Minimum pointer span in `px` required for multi-touch scaling. Default: `27`. */
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
  private readonly spanSlop: number;
  private readonly minSpan: number;

  private initialSpan = 0;
  private prevSpan = 0;
  private cumulativeScale = 1;
  private anchored = false;

  constructor(callbacks: ScaleCallbacks, options: Partial<ScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.spanSlop = Math.max(0, options.spanSlop ?? DEFAULT_SPAN_SLOP);
    this.minSpan = Math.max(1, options.minSpan ?? DEFAULT_MIN_SPAN);
  }

  override getTouchAction(): TouchActionValue {
    return 'pan-x pan-y';
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return true;
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case 'down': {
        this.cumulativeScale = 1;
        if (event.activePointerCount >= 2) {
          this.configureMultiPointerSpan(event);
        }
        break;
      }

      case 'pointer_down': {
        this.configureMultiPointerSpan(event);
        break;
      }

      case 'move': {
        if (event.activePointerCount < 2 || !this.anchored) {
          return;
        }

        const span = event.getSpan();

        if (!this.active) {
          if (span < this.minSpan) {
            return;
          }
          const baseSpan = Math.max(this.minSpan, this.initialSpan);
          const spanDelta = span - baseSpan;
          if (Math.abs(spanDelta) <= this.spanSlop) {
            return;
          }

          this.prevSpan = Math.max(this.minSpan, baseSpan + Math.sign(spanDelta) * this.spanSlop);
          this.cumulativeScale = 1;

          const started = this.tryBegin(() => {
            if (this.callbacks.onScaleStart) {
              this.callbacks.onScaleStart(this.buildEvent(event, 1));
            }
          });
          if (!started) {
            return;
          }
        }

        // Clamp at `minSpan` while active (matching `RotateRecognizer` and `3->2` re-anchors)
        // so pinching close and spreading back out stays alive without zoom spikes.
        const effectiveSpan = Math.max(this.minSpan, span);
        const scaleFactor = effectiveSpan / this.prevSpan;
        if (scaleFactor !== 1) {
          this.cumulativeScale *= scaleFactor;
          if (this.emitChange() && this.callbacks.onScale) {
            this.callbacks.onScale(this.buildEvent(event, scaleFactor));
          }
          this.prevSpan = effectiveSpan;
        }
        break;
      }

      case 'pointer_up': {
        if (event.activePointerCount < 2) {
          if (this.completeActive()) {
            if (this.callbacks.onScaleEnd) {
              this.callbacks.onScaleEnd(this.buildEvent(event, 1, centroid(event.pointers)));
            }
          } else {
            this.fail();
          }
          return;
        }
        this.configureMultiPointerSpan(event);
        break;
      }

      case 'up': {
        // An active scale always ends on the preceding `'pointer_up'` (fewer than 2 pointers).
        this.fail();
        break;
      }

      case 'cancel': {
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
    this.anchored = false;
  }

  private configureMultiPointerSpan(event: MotionEvent): void {
    const span = event.getSpan();
    this.initialSpan = span;
    this.prevSpan = this.active ? Math.max(this.minSpan, span) : span;
    this.anchored = true;
  }

  private buildEvent(
    event: MotionEvent,
    scaleFactor: number,
    centerOverride?: Point
  ): ScaleEventData {
    return {
      center: centerOverride ?? event.focus,
      motionEvent: event,
      originalEvent: event.originalEvent,
      scale: this.cumulativeScale,
      scaleFactor,
      isQuickScale: false,
    };
  }
}
