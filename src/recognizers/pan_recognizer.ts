import {MotionAction, type MotionEvent, type Point, ZERO_POINT} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';
import {VelocityTracker, type VelocityVector, ZERO_VELOCITY} from '../velocity_tracker.js';
import type {ViewConfiguration} from '../view_configuration.js';

export type CardinalDirection = 'left' | 'right' | 'up' | 'down';
export type GestureAxis = 'horizontal' | 'vertical';
export type PanDirection = 'horizontal' | 'vertical' | 'both';

export interface PanOptions {
  /**
   * Required number of simultaneous pointers, or `0` to track the focal point
   * smoothly across any number of pointers. Default: `1`.
   */
  numPointers: number;
  /** Movement distance in `px` required before panning begins. */
  slop: number;
  /** Axis constraint (`'horizontal'`, `'vertical'`, or `'both'`). Default: `'both'`. */
  direction: PanDirection;
  /** Minimum release speed in `px/s` required to trigger `onSwipe`. */
  minSwipeVelocity: number;
  /** Maximum radial velocity magnitude in `px/s`. */
  maxSwipeVelocity: number;
  /** Minimum travel distance in `px` along the release velocity vector required to trigger `onSwipe`. */
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
  /** Scalar focal-point speed `hypot(velocityX, velocityY)` in `px/s`. */
  readonly speed: number;
  /** Number of active pointers remaining on the surface. */
  readonly pointerCount: number;
}

export interface SwipeEventData extends PanEventData {
  /** Primary cardinal direction of the release velocity vector. */
  readonly direction: CardinalDirection;
  /** Primary axis of the release velocity vector (`'horizontal'` | `'vertical'`). */
  readonly axis: GestureAxis;
}

export interface PanCallbacks {
  onPanStart?: (data: PanEventData) => void;
  onPan?: (data: PanEventData) => void;
  onPanEnd?: (data: PanEventData) => void;
  onSwipe?: (data: SwipeEventData) => void;
  onPanCancel?: () => void;
}

function computeCardinalDirection(
  vx: number,
  vy: number
): {direction: CardinalDirection; axis: GestureAxis} {
  if (Math.abs(vx) >= Math.abs(vy)) {
    return {
      axis: 'horizontal',
      direction: vx >= 0 ? 'right' : 'left',
    };
  }
  return {
    axis: 'vertical',
    direction: vy >= 0 ? 'down' : 'up',
  };
}

interface MutablePoint {
  x: number;
  y: number;
}

function setPoint(pt: MutablePoint, x: number, y: number): void {
  pt.x = x;
  pt.y = y;
}

/** Centroid of every pointer in `event`, including the one lifting (`pointers` is never empty). */
function computeAllPointersCentroid(event: MotionEvent): Point {
  const pts = event.pointers;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < pts.length; i++) {
    sumX += pts[i].x;
    sumY += pts[i].y;
  }
  return {x: sumX / pts.length, y: sumY / pts.length};
}

export class PanRecognizer extends GestureRecognizer {
  readonly type = 'pan';

  private callbacks: PanCallbacks;
  private readonly userOptions: Partial<PanOptions>;

  private downFocus: Point = ZERO_POINT;
  private lastFocus: Point = ZERO_POINT;
  private readonly rawTravel: MutablePoint = {x: 0, y: 0};
  private readonly minTravel: MutablePoint = {x: 0, y: 0};
  private readonly maxTravel: MutablePoint = {x: 0, y: 0};
  private readonly totalDelta: MutablePoint = {x: 0, y: 0};
  private anchorReady = false;

  private tracker: VelocityTracker | null = null;
  private trackerConfig: ViewConfiguration | null = null;

  constructor(callbacks: PanCallbacks, options: Partial<PanOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  setCallbacks(callbacks: PanCallbacks): this {
    this.callbacks = callbacks;
    return this;
  }

  override get usesVelocity(): boolean {
    return true;
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
  override canRearmOnPointerDown(event: MotionEvent): boolean {
    return this.numPointers >= 2 && event.activePointerCount >= this.numPointers;
  }

  private get numPointers(): number {
    return this.userOptions.numPointers ?? 1;
  }

  private get slop(): number {
    return this.userOptions.slop ?? this.config.touchSlop;
  }

  private get direction(): PanDirection {
    return this.userOptions.direction ?? 'both';
  }

  private get minSwipeVelocity(): number {
    return this.userOptions.minSwipeVelocity ?? this.config.minimumSwipeVelocity;
  }

  private get maxSwipeVelocity(): number {
    return this.userOptions.maxSwipeVelocity ?? this.config.maximumSwipeVelocity;
  }

  private get minSwipeDistance(): number {
    return this.userOptions.minSwipeDistance ?? this.config.minimumSwipeDistance;
  }

  onMotionEvent(event: MotionEvent): void {
    const tracker = this.ensureTracker();
    tracker.addMovement(event);

    try {
      switch (event.action) {
        case MotionAction.DOWN: {
          setPoint(this.totalDelta, 0, 0);
          if (this.numPointers > 0 && event.activePointerCount > this.numPointers) {
            this.fail();
            return;
          }
          this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
          break;
        }

        case MotionAction.POINTER_DOWN: {
          if (this.numPointers > 0 && event.activePointerCount > this.numPointers) {
            if (this.active) {
              this.cancel(true);
            } else {
              this.fail();
            }
            return;
          }
          this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
          break;
        }

        case MotionAction.MOVE: {
          if (!this.anchorReady) {
            return;
          }

          const stepX = event.focus.x - this.lastFocus.x;
          const stepY = event.focus.y - this.lastFocus.y;
          this.lastFocus = event.focus;
          this.rawTravel.x += stepX;
          this.rawTravel.y += stepY;
          this.recordExtremum();

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

            setPoint(this.totalDelta, 0, 0);

            const started = this.tryBegin(() => {
              this.callbacks.onPanStart?.(this.buildEventData(event, 0, 0));
            });

            if (started && (postSlopX !== 0 || postSlopY !== 0)) {
              setPoint(this.totalDelta, postSlopX, postSlopY);
              this.emitChange(() => {
                this.callbacks.onPan?.(this.buildEventData(event, postSlopX, postSlopY));
              });
            }
            return;
          }

          if (stepX !== 0 || stepY !== 0) {
            this.totalDelta.x += stepX;
            this.totalDelta.y += stepY;
            this.emitChange(() => {
              this.callbacks.onPan?.(this.buildEventData(event, stepX, stepY));
            });
          }
          break;
        }

        case MotionAction.POINTER_UP: {
          if (this.numPointers > 0 && event.activePointerCount < this.numPointers) {
            const endCenter = computeAllPointersCentroid(event);
            this.finishGesture(event, endCenter, endCenter);
            return;
          }
          this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
          break;
        }

        case MotionAction.UP: {
          this.finishGesture(event, event.focus);
          break;
        }

        case MotionAction.CANCEL: {
          this.cancel();
          break;
        }
      }
    } finally {
      if (event.action === MotionAction.POINTER_UP) {
        tracker.finalizePointerUp(event, this.maxSwipeVelocity);
      }
    }
  }

  protected override onCancel(): void {
    this.callbacks.onPanCancel?.();
  }

  protected override onReset(): void {
    this.downFocus = ZERO_POINT;
    this.lastFocus = ZERO_POINT;
    setPoint(this.rawTravel, 0, 0);
    setPoint(this.minTravel, 0, 0);
    setPoint(this.maxTravel, 0, 0);
    setPoint(this.totalDelta, 0, 0);
    this.anchorReady = false;
    this.tracker?.clear();
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
      setPoint(this.rawTravel, 0, 0);
      setPoint(this.minTravel, 0, 0);
      setPoint(this.maxTravel, 0, 0);
    }
    this.anchorReady = ready;
  }

  private recordExtremum(): void {
    const {x, y} = this.rawTravel;
    if (x < this.minTravel.x) this.minTravel.x = x;
    if (x > this.maxTravel.x) this.maxTravel.x = x;
    if (y < this.minTravel.y) this.minTravel.y = y;
    if (y > this.maxTravel.y) this.maxTravel.y = y;
  }

  private finishGesture(event: MotionEvent, endFocus: Point, centerOverride?: Point): void {
    if (this.anchorReady) {
      this.rawTravel.x += endFocus.x - this.lastFocus.x;
      this.rawTravel.y += endFocus.y - this.lastFocus.y;
      this.lastFocus = endFocus;
      this.recordExtremum();
    }

    if (this.active) {
      const endData = this.buildEndEventData(event, centerOverride);
      const swipeData = this.evaluateSwipe(endData);
      this.completeActive(() => {
        this.callbacks.onPanEnd?.(endData);
        if (swipeData) {
          this.callbacks.onSwipe?.(swipeData);
        }
      });
      return;
    }

    // Handle single-frame flicks where `UP` arrives past `slop` without an intermediate `MOVE`:
    if (this.anchorReady && this.callbacks.onSwipe) {
      const dx = endFocus.x - this.downFocus.x;
      const dy = endFocus.y - this.downFocus.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.slop && this.matchesDirectionLock(dx, dy)) {
        const slopRatio = this.slop / dist;
        setPoint(this.totalDelta, dx * (1 - slopRatio), dy * (1 - slopRatio));
        const endData = this.buildEndEventData(event, centerOverride);
        const swipeData = this.evaluateSwipe(endData);
        if (swipeData) {
          this.tryRecognizeDiscrete(() => {
            this.callbacks.onSwipe?.(swipeData);
          });
          return;
        }
      }
    }

    this.fail();
  }

  private evaluateSwipe(endData: PanEventData): SwipeEventData | null {
    if (!this.callbacks.onSwipe) {
      return null;
    }
    const {velocityX: vx, velocityY: vy, speed} = endData;
    if (speed < this.minSwipeVelocity || speed <= 0) {
      return null;
    }

    // Measure continuous focal travel from the stroke's opposing extremum along `(vx, vy)` so
    // pull-out-then-flick-back succeeds, liftoff recoil (`< minSwipeDistance`) fails, and
    // multi-pointer re-anchoring jumps neither fabricate nor erase swipe travel.
    const spanX =
      vx >= 0 ? this.rawTravel.x - this.minTravel.x : this.maxTravel.x - this.rawTravel.x;
    const spanY =
      vy >= 0 ? this.rawTravel.y - this.minTravel.y : this.maxTravel.y - this.rawTravel.y;
    const travelInVelocityDir = (spanX * Math.abs(vx) + spanY * Math.abs(vy)) / speed;
    if (travelInVelocityDir < this.minSwipeDistance) {
      return null;
    }

    const {direction, axis} = computeCardinalDirection(vx, vy);
    if (this.direction !== 'both' && axis !== this.direction) {
      return null;
    }

    return {
      ...endData,
      direction,
      axis,
    };
  }

  private ensureTracker(): VelocityTracker {
    const cfg = this.config;
    if (!this.tracker || this.trackerConfig !== cfg) {
      this.tracker = new VelocityTracker({
        horizonMs: cfg.velocityHorizonMs,
        assumePointerStoppedMs: cfg.assumePointerStoppedMs,
      });
      this.trackerConfig = cfg;
    }
    return this.tracker;
  }

  private readActiveVelocity(event: MotionEvent): VelocityVector {
    const tracker = this.ensureTracker();
    tracker.computeCurrentVelocity(1000, this.maxSwipeVelocity);
    const active = event.getActivePointers();
    if (active.length <= 1) {
      return tracker.getVelocity(active[0]?.pointerId ?? event.actionPointerId);
    }
    return tracker.getCentroidVelocity(active);
  }

  private buildEventData(event: MotionEvent, stepX: number, stepY: number): PanEventData {
    const vel = this.readActiveVelocity(event);
    return {
      ...this.createEventData(event),
      deltaX: this.totalDelta.x,
      deltaY: this.totalDelta.y,
      stepX,
      stepY,
      velocityX: vel.x,
      velocityY: vel.y,
      speed: vel.speed,
      pointerCount: event.activePointerCount,
    };
  }

  private buildEndEventData(event: MotionEvent, centerOverride?: Point): PanEventData {
    const hasEndConsumer = Boolean(this.callbacks.onPanEnd || this.callbacks.onSwipe);
    let vel = ZERO_VELOCITY;
    if (hasEndConsumer) {
      const tracker = this.ensureTracker();
      tracker.computeCurrentVelocity(1000, this.maxSwipeVelocity);
      vel =
        event.pointerCount > 1
          ? tracker.getCentroidVelocity(event.pointers)
          : tracker.getVelocity(event.actionPointerId);
    }
    return {
      ...this.createEventData(event, centerOverride),
      deltaX: this.totalDelta.x,
      deltaY: this.totalDelta.y,
      stepX: 0,
      stepY: 0,
      velocityX: vel.x,
      velocityY: vel.y,
      speed: vel.speed,
      pointerCount: event.activePointerCount,
    };
  }
}
