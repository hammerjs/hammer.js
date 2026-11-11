import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';
import {VelocityTracker, type VelocityVector, ZERO_VELOCITY} from '../velocity_tracker';
import type {ViewConfiguration} from '../view_configuration';

export type CardinalDirection = 'left' | 'right' | 'up' | 'down';
export type GestureAxis = 'horizontal' | 'vertical';
export type PanDirection = 'all' | GestureAxis | CardinalDirection;

export interface PanOptions {
  /**
   * Required number of simultaneous pointers, or `0` to track the focal point
   * smoothly across any number of pointers. Default: `1`.
   */
  numPointers: number;
  /** Movement distance in `px` required before panning begins. */
  slop: number;
  /** Axis or cardinal direction constraint. Default: `'all'`. */
  direction: PanDirection;
  /** Minimum release speed in `px/s` required to trigger `onFling`. */
  minFlingVelocity: number;
  /** Maximum radial velocity magnitude in `px/s`. */
  maxFlingVelocity: number;
  /** Minimum travel distance in `px` along the release velocity vector required to trigger `onFling`. */
  minFlingDistance: number;
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

export interface FlingEventData extends PanEventData {
  /** Primary cardinal direction of the release velocity vector. */
  readonly direction: CardinalDirection;
  /** Primary axis of the release velocity vector (`'horizontal'` | `'vertical'`). */
  readonly axis: GestureAxis;
}

export interface PanCallbacks {
  onPanStart?: (data: PanEventData) => void;
  onPan?: (data: PanEventData) => void;
  onPanEnd?: (data: PanEventData) => void;
  onFling?: (data: FlingEventData) => void;
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

  private readonly callbacks: PanCallbacks;
  private readonly userOptions: Partial<PanOptions>;

  private downFocusX = 0;
  private downFocusY = 0;
  private lastFocusX = 0;
  private lastFocusY = 0;
  private minFocusX = 0;
  private maxFocusX = 0;
  private minFocusY = 0;
  private maxFocusY = 0;
  private totalDeltaX = 0;
  private totalDeltaY = 0;
  private anchorReady = false;

  private tracker: VelocityTracker | null = null;
  private trackerConfig: ViewConfiguration | null = null;

  constructor(callbacks: PanCallbacks, options: Partial<PanOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  override get usesVelocity(): boolean {
    return true;
  }

  override getTouchAction(): TouchActionValue {
    switch (this.direction) {
      case 'horizontal':
      case 'left':
      case 'right':
        return 'pan-y pinch-zoom';
      case 'vertical':
      case 'up':
      case 'down':
        return 'pan-x pinch-zoom';
      case 'all':
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
    return this.userOptions.direction ?? 'all';
  }

  private get minFlingVelocity(): number {
    return this.userOptions.minFlingVelocity ?? this.config.minimumFlingVelocity;
  }

  private get maxFlingVelocity(): number {
    return this.userOptions.maxFlingVelocity ?? this.config.maximumFlingVelocity;
  }

  private get minFlingDistance(): number {
    return this.userOptions.minFlingDistance ?? this.config.minimumFlingDistance;
  }

  onMotionEvent(event: MotionEvent): void {
    const tracker = this.ensureTracker();
    tracker.addMovement(event);

    try {
      switch (event.action) {
        case MotionAction.DOWN: {
          this.totalDeltaX = 0;
          this.totalDeltaY = 0;
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

          this.recordExtremum(event.focusX, event.focusY);

          if (!this.active) {
            const dxFromDown = event.focusX - this.downFocusX;
            const dyFromDown = event.focusY - this.downFocusY;
            const distFromDown = Math.hypot(dxFromDown, dyFromDown);

            this.lastFocusX = event.focusX;
            this.lastFocusY = event.focusY;

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
              this.callbacks.onPanStart?.(this.buildEventData(event, 0, 0));
            });

            if (started && (postSlopX !== 0 || postSlopY !== 0)) {
              this.totalDeltaX = postSlopX;
              this.totalDeltaY = postSlopY;
              this.emitChange(() => {
                this.callbacks.onPan?.(this.buildEventData(event, postSlopX, postSlopY));
              });
            }
            return;
          }

          const stepX = event.focusX - this.lastFocusX;
          const stepY = event.focusY - this.lastFocusY;
          this.lastFocusX = event.focusX;
          this.lastFocusY = event.focusY;

          if (stepX !== 0 || stepY !== 0) {
            this.totalDeltaX += stepX;
            this.totalDeltaY += stepY;
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
        tracker.finalizePointerUp(event, this.maxFlingVelocity);
      }
    }
  }

  protected override onCancel(): void {
    this.callbacks.onPanCancel?.();
  }

  protected override onReset(): void {
    this.downFocusX = 0;
    this.downFocusY = 0;
    this.lastFocusX = 0;
    this.lastFocusY = 0;
    this.minFocusX = 0;
    this.maxFocusX = 0;
    this.minFocusY = 0;
    this.maxFocusY = 0;
    this.totalDeltaX = 0;
    this.totalDeltaY = 0;
    this.anchorReady = false;
    this.tracker?.clear();
  }

  private matchesPointerRequirement(activeCount: number): boolean {
    return this.numPointers === 0 ? activeCount >= 1 : activeCount === this.numPointers;
  }

  private matchesDirectionLock(dx: number, dy: number): boolean {
    switch (this.direction) {
      case 'all':
        return true;
      case 'horizontal':
        return Math.abs(dx) >= Math.abs(dy);
      case 'vertical':
        return Math.abs(dy) >= Math.abs(dx);
      case 'left':
        return Math.abs(dx) >= Math.abs(dy) && dx < 0;
      case 'right':
        return Math.abs(dx) >= Math.abs(dy) && dx > 0;
      case 'up':
        return Math.abs(dy) >= Math.abs(dx) && dy < 0;
      case 'down':
        return Math.abs(dy) >= Math.abs(dx) && dy > 0;
    }
  }

  private matchesFlingDirection(direction: CardinalDirection, axis: GestureAxis): boolean {
    const filter = this.direction;
    if (filter === 'all') {
      return true;
    }
    if (filter === 'horizontal' || filter === 'vertical') {
      return axis === filter;
    }
    return direction === filter;
  }

  private reanchor(focus: Point, ready: boolean): void {
    this.downFocusX = focus.x;
    this.downFocusY = focus.y;
    this.lastFocusX = focus.x;
    this.lastFocusY = focus.y;
    if (!this.active) {
      this.minFocusX = focus.x;
      this.maxFocusX = focus.x;
      this.minFocusY = focus.y;
      this.maxFocusY = focus.y;
    } else {
      this.recordExtremum(focus.x, focus.y);
    }
    this.anchorReady = ready;
  }

  private recordExtremum(x: number, y: number): void {
    if (x < this.minFocusX) this.minFocusX = x;
    if (x > this.maxFocusX) this.maxFocusX = x;
    if (y < this.minFocusY) this.minFocusY = y;
    if (y > this.maxFocusY) this.maxFocusY = y;
  }

  private finishGesture(event: MotionEvent, endFocus: Point, centerOverride?: Point): void {
    if (this.anchorReady) {
      this.recordExtremum(endFocus.x, endFocus.y);
    }

    if (this.active) {
      const endData = this.buildEndEventData(event, centerOverride);
      const flingData = this.evaluateFling(endFocus, endData);
      this.completeActive(() => {
        this.callbacks.onPanEnd?.(endData);
        if (flingData) {
          this.callbacks.onFling?.(flingData);
        }
      });
      return;
    }

    // Handle single-frame flicks where `UP` arrives past `slop` without an intermediate `MOVE`:
    if (this.anchorReady && this.callbacks.onFling) {
      const dx = endFocus.x - this.downFocusX;
      const dy = endFocus.y - this.downFocusY;
      const dist = Math.hypot(dx, dy);
      if (dist > this.slop && this.matchesDirectionLock(dx, dy)) {
        const slopRatio = this.slop / dist;
        this.totalDeltaX = dx * (1 - slopRatio);
        this.totalDeltaY = dy * (1 - slopRatio);
        const endData = this.buildEndEventData(event, centerOverride);
        const flingData = this.evaluateFling(endFocus, endData);
        if (flingData) {
          this.tryRecognizeDiscrete(() => {
            this.callbacks.onFling?.(flingData);
          });
          return;
        }
      }
    }

    this.fail();
  }

  private evaluateFling(endFocus: Point, endData: PanEventData): FlingEventData | null {
    if (!this.callbacks.onFling) {
      return null;
    }
    const {velocityX: vx, velocityY: vy, speed} = endData;
    if (speed < this.minFlingVelocity || speed <= 0) {
      return null;
    }

    // Measure travel toward `endFocus` from the stroke's opposing extremum along `(vx, vy)` so
    // pull-out-then-flick-back succeeds while tiny liftoff recoil (`< minFlingDistance`) fails.
    const spanX = vx >= 0 ? endFocus.x - this.minFocusX : this.maxFocusX - endFocus.x;
    const spanY = vy >= 0 ? endFocus.y - this.minFocusY : this.maxFocusY - endFocus.y;
    const travelInVelocityDir = (spanX * Math.abs(vx) + spanY * Math.abs(vy)) / speed;
    if (travelInVelocityDir < this.minFlingDistance) {
      return null;
    }

    const {direction, axis} = computeCardinalDirection(vx, vy);
    if (!this.matchesFlingDirection(direction, axis)) {
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
    tracker.computeCurrentVelocity(1000, this.maxFlingVelocity);
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
      deltaX: this.totalDeltaX,
      deltaY: this.totalDeltaY,
      stepX,
      stepY,
      velocityX: vel.x,
      velocityY: vel.y,
      speed: vel.speed,
      pointerCount: event.activePointerCount,
    };
  }

  private buildEndEventData(event: MotionEvent, centerOverride?: Point): PanEventData {
    const hasEndConsumer = Boolean(this.callbacks.onPanEnd || this.callbacks.onFling);
    let vel = ZERO_VELOCITY;
    if (hasEndConsumer) {
      const tracker = this.ensureTracker();
      tracker.computeCurrentVelocity(1000, this.maxFlingVelocity);
      vel =
        event.pointerCount > 1
          ? tracker.getCentroidVelocity(event.pointers)
          : tracker.getVelocity(event.actionPointerId);
    }
    return {
      ...this.createEventData(event, centerOverride),
      deltaX: this.totalDeltaX,
      deltaY: this.totalDeltaY,
      stepX: 0,
      stepY: 0,
      velocityX: vel.x,
      velocityY: vel.y,
      speed: vel.speed,
      pointerCount: event.activePointerCount,
    };
  }
}
