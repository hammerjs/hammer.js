import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';
import type {VelocityVector} from '../velocity_tracker';

export type PanDirection = 'all' | 'horizontal' | 'vertical';

const ZERO_VELOCITY: VelocityVector = Object.freeze({x: 0, y: 0, speed: 0});

export interface PanOptions {
  /**
   * Required number of simultaneous pointers, or `0` to track the focal point
   * smoothly across any number of pointers. Default: `1`.
   */
  numPointers: number;
  /** Movement distance in `px` required before panning begins. */
  slop: number;
  /** Axis constraint (`'all'` | `'horizontal'` | `'vertical'`). Default: `'all'`. */
  direction: PanDirection;
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

export interface PanCallbacks {
  onPanStart?: (data: PanEventData) => void;
  onPan?: (data: PanEventData) => void;
  onPanEnd?: (data: PanEventData) => void;
  onPanCancel?: () => void;
}

export class PanRecognizer extends GestureRecognizer {
  readonly type = 'pan';

  private readonly callbacks: PanCallbacks;
  private readonly userOptions: Partial<PanOptions>;

  private downFocusX = 0;
  private downFocusY = 0;
  private lastFocusX = 0;
  private lastFocusY = 0;
  private totalDeltaX = 0;
  private totalDeltaY = 0;
  private anchorReady = false;

  constructor(callbacks: PanCallbacks, options: Partial<PanOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  override getTouchAction(): TouchActionValue {
    switch (this.direction) {
      case 'horizontal':
        return 'pan-y pinch-zoom';
      case 'vertical':
        return 'pan-x pinch-zoom';
      case 'all':
        return 'none';
    }
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

  onMotionEvent(event: MotionEvent): void {
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

        if (!this.active) {
          const dxFromDown = event.focusX - this.downFocusX;
          const dyFromDown = event.focusY - this.downFocusY;
          const distFromDown = Math.hypot(dxFromDown, dyFromDown);

          this.lastFocusX = event.focusX;
          this.lastFocusY = event.focusY;

          if (distFromDown <= this.slop) {
            return;
          }

          if (!this.matchesAxisLock(dxFromDown, dyFromDown)) {
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
            if (this.callbacks.onPan) {
              this.emitChange(() => {
                this.callbacks.onPan?.(this.buildEventData(event, postSlopX, postSlopY));
              });
            }
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
          if (this.active) {
            this.completeActive(() => {
              this.callbacks.onPanEnd?.(this.buildEndEventData(event));
            });
          } else {
            this.fail();
          }
          return;
        }
        this.reanchor(event.focus, this.matchesPointerRequirement(event.activePointerCount));
        break;
      }

      case MotionAction.UP: {
        if (this.active) {
          this.completeActive(() => {
            this.callbacks.onPanEnd?.(this.buildEndEventData(event));
          });
        } else {
          this.fail();
        }
        break;
      }

      case MotionAction.CANCEL: {
        this.cancel();
        break;
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
    this.totalDeltaX = 0;
    this.totalDeltaY = 0;
    this.anchorReady = false;
  }

  private matchesPointerRequirement(activeCount: number): boolean {
    return this.numPointers === 0 ? activeCount >= 1 : activeCount === this.numPointers;
  }

  private matchesAxisLock(dx: number, dy: number): boolean {
    if (this.direction === 'horizontal') {
      return Math.abs(dx) >= Math.abs(dy);
    }
    if (this.direction === 'vertical') {
      return Math.abs(dy) >= Math.abs(dx);
    }
    return true;
  }

  private reanchor(focus: Point, ready: boolean): void {
    this.downFocusX = focus.x;
    this.downFocusY = focus.y;
    this.lastFocusX = focus.x;
    this.lastFocusY = focus.y;
    this.anchorReady = ready;
  }

  private readActiveVelocity(event: MotionEvent): VelocityVector {
    const tracker = this.velocityTracker;
    if (!tracker) {
      return ZERO_VELOCITY;
    }
    tracker.computeCurrentVelocity(1000, this.config.maximumFlingVelocity);
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

  private buildEndEventData(event: MotionEvent): PanEventData {
    const tracker = this.velocityTracker;
    let vel = ZERO_VELOCITY;
    if (tracker) {
      tracker.computeCurrentVelocity(1000, this.config.maximumFlingVelocity);
      vel =
        event.pointerCount > 1
          ? tracker.getCentroidVelocity(event.pointers)
          : tracker.getVelocity(event.actionPointerId);
    }
    return {
      ...this.createEventData(event),
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
