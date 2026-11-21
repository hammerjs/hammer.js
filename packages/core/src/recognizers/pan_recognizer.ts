import {createDescriptor, type GestureDescriptor} from '../descriptors.js';
import {centroid, type MotionEvent, type Point, ZERO_POINT} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_action.js';
import {VelocityTracker} from '../velocity_tracker.js';
import {type CardinalDirection, type PanDirection, SwipeTracker} from './swipe_tracker.js';

export type {CardinalDirection, PanDirection};

const DEFAULT_SLOP = 8;
const DEFAULT_MIN_SWIPE_VELOCITY = 300;
const DEFAULT_MAX_SWIPE_VELOCITY = 8000;
const DEFAULT_MIN_SWIPE_DISTANCE = 30;

export interface PanOptions {
  /**
   * Required number of simultaneous pointers, or `0` to track the focal point
   * smoothly across any number of pointers. Default: `1`.
   */
  numPointers: number;
  /** Movement distance in `px` required before panning begins. Default: `8`. */
  slop: number;
  /** Axis constraint (`'horizontal'`, `'vertical'`, or `'both'`). Default: `'both'`. */
  direction: PanDirection;
  /** Minimum release speed in `px/s` required to trigger `onSwipe`. Default: `300`. */
  minSwipeVelocity: number;
  /** Maximum radial velocity magnitude in `px/s`. Default: `8000`. */
  maxSwipeVelocity: number;
  /** Minimum travel distance in `px` along the release velocity vector required to trigger `onSwipe`. Default: `30`. */
  minSwipeDistance: number;
}

export interface PanEventData extends GestureEventData {
  /** Cumulative post-slop horizontal translation in `px` since pan began. */
  readonly deltaX: number;
  /** Cumulative post-slop vertical translation in `px` since pan began. */
  readonly deltaY: number;
  /** Incremental horizontal movement in `px` since the previous pan update. */
  readonly stepX: number;
  /** Incremental vertical movement in `px` since the previous pan update. */
  readonly stepY: number;
  /** Current focal-point horizontal velocity in `px/s`. */
  readonly velocityX: number;
  /** Current focal-point vertical velocity in `px/s`. */
  readonly velocityY: number;
}

export interface SwipeEventData extends PanEventData {
  /** Primary cardinal direction of the release velocity vector. */
  readonly direction: CardinalDirection;
}

export interface PanCallbacks {
  onPanStart?: (data: PanEventData) => void;
  onPan?: (data: PanEventData) => void;
  onPanEnd?: (data: PanEventData) => void;
  onSwipe?: (data: SwipeEventData) => void;
  onPanCancel?: () => void;
}

export class PanRecognizer extends GestureRecognizer {
  private readonly callbacks: PanCallbacks;
  private readonly numPointers: number;
  private readonly slop: number;
  private readonly direction: PanDirection;
  private readonly maxSwipeVelocity: number;
  private readonly swipe: SwipeTracker;
  private readonly tracker = new VelocityTracker();

  private downFocus: Point = ZERO_POINT;
  private lastFocus: Point = ZERO_POINT;
  private totalDeltaX = 0;
  private totalDeltaY = 0;
  private anchorReady = false;

  constructor(callbacks: PanCallbacks, options: Partial<PanOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.numPointers = options.numPointers ?? 1;
    this.slop = Math.max(0, options.slop ?? DEFAULT_SLOP);
    this.direction = options.direction ?? 'both';
    this.maxSwipeVelocity = options.maxSwipeVelocity ?? DEFAULT_MAX_SWIPE_VELOCITY;
    this.swipe = new SwipeTracker(
      this.direction,
      options.minSwipeVelocity ?? DEFAULT_MIN_SWIPE_VELOCITY,
      options.minSwipeDistance ?? DEFAULT_MIN_SWIPE_DISTANCE
    );
  }

  override getTouchAction(): TouchActionValue {
    switch (this.direction) {
      case 'horizontal':
        return 'pan-y pinch-zoom';
      case 'vertical':
        return 'pan-x pinch-zoom';
      case 'both':
        return 'none';
    }
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return this.numPointers === 0 || this.numPointers >= 2;
  }

  /** @internal */
  override get needsCoalescedHistory(): boolean {
    return true;
  }

  override onMotionEvent(event: MotionEvent): void {
    this.tracker.addMovement(event);
    try {
      super.onMotionEvent(event);
    } finally {
      if (event.action === 'pointer_up') {
        this.tracker.finalizePointerUp(event, this.maxSwipeVelocity);
      }
    }
  }

  protected override onDown(event: MotionEvent): void {
    this.totalDeltaX = 0;
    this.totalDeltaY = 0;
    if (this.numPointers > 0 && event.activePointerCount > this.numPointers) {
      this.fail();
      return;
    }
    this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
  }

  protected override onPointerDown(event: MotionEvent): void {
    if (this.numPointers > 0 && event.activePointerCount > this.numPointers) {
      if (this.active) {
        this.cancel();
      } else {
        this.fail();
      }
      return;
    }
    this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
  }

  protected override onMove(event: MotionEvent): void {
    if (!this.anchorReady) {
      return;
    }

    const stepX = event.focus.x - this.lastFocus.x;
    const stepY = event.focus.y - this.lastFocus.y;
    this.lastFocus = event.focus;
    this.swipe.record(stepX, stepY);

    if (!this.active) {
      const dxFromDown = event.focus.x - this.downFocus.x;
      const dyFromDown = event.focus.y - this.downFocus.y;
      const distFromDown = Math.hypot(dxFromDown, dyFromDown);

      if (distFromDown <= this.slop) {
        return;
      }

      if (!this.matchesDirectionLock(dxFromDown, dyFromDown)) {
        this.fail();
        return;
      }

      const slopRatio = this.slop / distFromDown;
      const postSlopX = dxFromDown * (1 - slopRatio);
      const postSlopY = dyFromDown * (1 - slopRatio);

      this.totalDeltaX = 0;
      this.totalDeltaY = 0;

      const started = this.tryBegin(() => {
        if (this.callbacks.onPanStart) {
          this.callbacks.onPanStart(this.buildEventData(event, 0, 0));
        }
      });

      if (started && (postSlopX !== 0 || postSlopY !== 0) && this.emitChange()) {
        this.totalDeltaX = postSlopX;
        this.totalDeltaY = postSlopY;
        if (this.callbacks.onPan) {
          this.callbacks.onPan(this.buildEventData(event, postSlopX, postSlopY));
        }
      }
      return;
    }

    if ((stepX !== 0 || stepY !== 0) && this.emitChange()) {
      this.totalDeltaX += stepX;
      this.totalDeltaY += stepY;
      if (this.callbacks.onPan) {
        this.callbacks.onPan(this.buildEventData(event, stepX, stepY));
      }
    }
  }

  protected override onPointerUp(event: MotionEvent): void {
    if (this.numPointers > 0 && event.activePointerCount < this.numPointers) {
      const endCenter = centroid(event.pointers);
      this.finishGesture(event, endCenter, endCenter);
      return;
    }
    this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
  }

  protected override onUp(event: MotionEvent): void {
    this.finishGesture(event, event.focus);
  }

  protected override onCancel(): void {
    this.callbacks.onPanCancel?.();
  }

  protected override onReset(): void {
    this.downFocus = ZERO_POINT;
    this.lastFocus = ZERO_POINT;
    this.totalDeltaX = 0;
    this.totalDeltaY = 0;
    this.anchorReady = false;
    this.swipe.reset();
    this.tracker.clear();
  }

  private matchesPointerRequirement(activeCount: number): boolean {
    return this.numPointers === 0 ? activeCount >= 1 : activeCount === this.numPointers;
  }

  private matchesDirectionLock(dx: number, dy: number): boolean {
    switch (this.direction) {
      case 'horizontal':
        return Math.abs(dx) >= Math.abs(dy);
      case 'vertical':
        return Math.abs(dy) >= Math.abs(dx);
      case 'both':
        return true;
    }
  }

  private reanchor(focus: Point, ready: boolean): void {
    this.downFocus = focus;
    this.lastFocus = focus;
    if (!this.active) {
      this.swipe.reset();
    }
    this.anchorReady = ready;
  }

  private finishGesture(event: MotionEvent, endFocus: Point, centerOverride?: Point): void {
    if (!this.active) {
      this.fail();
      return;
    }
    if (this.anchorReady) {
      this.swipe.record(endFocus.x - this.lastFocus.x, endFocus.y - this.lastFocus.y);
      this.lastFocus = endFocus;
    }

    const hasEndConsumer = Boolean(this.callbacks.onPanEnd || this.callbacks.onSwipe);
    const endData = hasEndConsumer ? this.buildEventData(event, 0, 0, centerOverride) : null;
    const swipeDirection =
      endData && this.callbacks.onSwipe
        ? this.swipe.classify(endData.velocityX, endData.velocityY)
        : null;

    if (this.completeActive()) {
      if (endData && this.callbacks.onPanEnd) {
        this.callbacks.onPanEnd(endData);
      }
      if (endData && swipeDirection && this.callbacks.onSwipe && this.state === 'ended') {
        this.callbacks.onSwipe({...endData, direction: swipeDirection});
      }
    }
  }

  private buildEventData(
    event: MotionEvent,
    stepX: number,
    stepY: number,
    centerOverride?: Point
  ): PanEventData {
    this.tracker.computeCurrentVelocity(this.maxSwipeVelocity);
    const vel =
      event.pointers.length > 1
        ? this.tracker.getCentroidVelocity(event.pointers)
        : this.tracker.getVelocity(event.actionPointerId);
    return {
      center: centerOverride ?? event.focus,
      motionEvent: event,
      originalEvent: event.originalEvent,
      deltaX: this.totalDeltaX,
      deltaY: this.totalDeltaY,
      stepX,
      stepY,
      velocityX: vel.x,
      velocityY: vel.y,
    };
  }
}

export type PanGestureOptions = Partial<PanOptions> & PanCallbacks;

/** Creates a tree-shakable `PanRecognizer` descriptor (with optional `onSwipe` flick detection). */
export function pan(options?: PanGestureOptions): GestureDescriptor {
  return createDescriptor(
    'pan',
    options as Record<string, unknown> | undefined,
    (cbs, cfg) => new PanRecognizer(cbs as PanCallbacks, cfg as Partial<PanOptions>)
  );
}
