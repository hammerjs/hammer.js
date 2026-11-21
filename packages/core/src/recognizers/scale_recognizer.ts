import {createDescriptor, type GestureDescriptor} from '../descriptors.js';
import {centroid, type MotionEvent, type Point} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_action.js';

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

  protected override onDown(event: MotionEvent): void {
    this.cumulativeScale = 1;
    if (event.activePointerCount >= 2) {
      this.configureMultiPointerSpan(event);
    }
  }

  protected override onPointerDown(event: MotionEvent): void {
    this.configureMultiPointerSpan(event);
  }

  protected override onMove(event: MotionEvent): void {
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

      this.tryBegin(grantEvent => {
        const startEvent = grantEvent ?? event;
        if (this.callbacks.onScaleStart) {
          this.callbacks.onScaleStart(this.buildEvent(startEvent, 1));
        }
        this.emitScale(startEvent);
      });
      return;
    }

    this.emitScale(event);
  }

  protected override onPointerUp(event: MotionEvent): void {
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
  }

  protected override onUp(): void {
    // An active scale always ends on the preceding `'pointer_up'` (fewer than 2 pointers).
    this.fail();
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

  private emitScale(event: MotionEvent): void {
    // Clamp at `minSpan` while active (matching `RotateRecognizer` and `3->2` re-anchors)
    // so pinching close and spreading back out stays alive without zoom spikes.
    const effectiveSpan = Math.max(this.minSpan, event.getSpan());
    const scaleFactor = effectiveSpan / this.prevSpan;
    if (scaleFactor !== 1 && this.emitChange()) {
      this.cumulativeScale *= scaleFactor;
      if (this.callbacks.onScale) {
        this.callbacks.onScale(this.buildEvent(event, scaleFactor));
      }
      this.prevSpan = effectiveSpan;
    }
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
      ...this.createEventData(event, centerOverride),
      scale: this.cumulativeScale,
      scaleFactor,
      isQuickScale: false,
    };
  }
}

export type ScaleGestureOptions = Partial<ScaleOptions> & ScaleCallbacks;

/** Creates a tree-shakable `ScaleRecognizer` descriptor (multi-pointer pinch zoom). */
export function scale(options?: ScaleGestureOptions): GestureDescriptor {
  return createDescriptor(
    'scale',
    options as Record<string, unknown> | undefined,
    (cbs, cfg) => new ScaleRecognizer(cbs as ScaleCallbacks, cfg as Partial<ScaleOptions>)
  );
}
