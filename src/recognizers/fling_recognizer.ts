import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';
import {PanRecognizer} from './pan_recognizer';

export type CardinalDirection = 'left' | 'right' | 'up' | 'down';
export type GestureAxis = 'horizontal' | 'vertical';
export type FlingDirectionFilter = 'all' | GestureAxis | CardinalDirection;

export interface FlingOptions {
  /** Required number of pointers. Default: `1`. */
  numPointers: number;
  /** Minimum release speed in `px/s` required to recognize a fling. */
  minVelocity: number;
  /** Maximum radial velocity magnitude in `px/s`. */
  maxVelocity: number;
  /** Minimum net displacement in `px` from touch down to release. */
  minDistance: number;
  /** Restrict recognition to a specific axis or cardinal direction. Default: `'all'`. */
  direction: FlingDirectionFilter;
  /** Recognize simultaneously alongside `PanRecognizer`. Default: `true`. */
  simultaneousWithPan: boolean;
}

export interface FlingEventData extends GestureEventData {
  readonly velocityX: number;
  readonly velocityY: number;
  readonly speed: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly direction: CardinalDirection;
  readonly axis: GestureAxis;
}

export interface FlingCallbacks {
  onFling?: (data: FlingEventData) => void;
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

export class FlingRecognizer extends GestureRecognizer {
  readonly type = 'fling';

  private readonly callbacks: FlingCallbacks;
  private readonly userOptions: Partial<FlingOptions>;

  private startFocus: Point | null = null;
  private maxPointersSeen = 0;
  private axisDecided = false;
  private axisLocked = false;

  constructor(callbacks: FlingCallbacks, options: Partial<FlingOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  override getTouchAction(): TouchActionValue {
    switch (this.directionFilter) {
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

  protected override get locksTouchMove(): boolean {
    return this.axisLocked;
  }

  private get numPointers(): number {
    return this.userOptions.numPointers ?? 1;
  }

  private get minVelocity(): number {
    return this.userOptions.minVelocity ?? this.config.minimumFlingVelocity;
  }

  private get maxVelocity(): number {
    return this.userOptions.maxVelocity ?? this.config.maximumFlingVelocity;
  }

  private get minDistance(): number {
    return this.userOptions.minDistance ?? this.config.minimumFlingDistance;
  }

  private get directionFilter(): FlingDirectionFilter {
    return this.userOptions.direction ?? 'all';
  }

  private get simultaneousWithPan(): boolean {
    return this.userOptions.simultaneousWithPan ?? true;
  }

  override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    if (this.simultaneousWithPan && other instanceof PanRecognizer) {
      return true;
    }
    return super.canRecognizeSimultaneouslyWith(other);
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        this.axisDecided = false;
        this.axisLocked = false;
        this.maxPointersSeen = event.activePointerCount;
        if (this.maxPointersSeen > this.numPointers) {
          this.fail();
          return;
        }
        if (event.activePointerCount === this.numPointers) {
          this.startFocus = event.focus;
        }
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.maxPointersSeen = Math.max(this.maxPointersSeen, event.activePointerCount);
        if (this.maxPointersSeen > this.numPointers) {
          this.fail();
          return;
        }
        if (event.activePointerCount === this.numPointers && !this.startFocus) {
          this.startFocus = event.focus;
        }
        break;
      }

      case MotionAction.MOVE: {
        if (!this.axisDecided && this.startFocus && this.directionFilter !== 'all') {
          const dx = event.focusX - this.startFocus.x;
          const dy = event.focusY - this.startFocus.y;
          if (Math.hypot(dx, dy) > this.config.touchSlop) {
            this.axisDecided = true;
            const isHorizontal =
              this.directionFilter === 'horizontal' ||
              this.directionFilter === 'left' ||
              this.directionFilter === 'right';
            this.axisLocked = isHorizontal
              ? Math.abs(dx) >= Math.abs(dy)
              : Math.abs(dy) >= Math.abs(dx);
          }
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        break;
      }

      case MotionAction.UP: {
        this.axisLocked = false;
        const tracker = this.velocityTracker;
        if (this.maxPointersSeen !== this.numPointers || !this.startFocus || !tracker) {
          this.fail();
          return;
        }

        const deltaX = event.focusX - this.startFocus.x;
        const deltaY = event.focusY - this.startFocus.y;
        if (Math.hypot(deltaX, deltaY) < this.minDistance) {
          this.fail();
          return;
        }

        tracker.computeCurrentVelocity(1000, this.maxVelocity);
        const vel =
          this.numPointers > 1
            ? tracker.getCentroidVelocity()
            : tracker.getVelocity(event.actionPointerId);

        if (vel.speed < this.minVelocity) {
          this.fail();
          return;
        }

        const {direction, axis} = computeCardinalDirection(vel.x, vel.y);
        if (!this.matchesDirectionFilter(direction, axis)) {
          this.fail();
          return;
        }

        const payload: FlingEventData = {
          ...this.createEventData(event),
          velocityX: vel.x,
          velocityY: vel.y,
          speed: vel.speed,
          deltaX,
          deltaY,
          direction,
          axis,
        };

        this.tryRecognizeDiscrete(() => {
          this.callbacks.onFling?.(payload);
        });
        break;
      }

      case MotionAction.CANCEL: {
        this.axisLocked = false;
        this.cancel();
        break;
      }
    }
  }

  protected override onReset(): void {
    this.startFocus = null;
    this.maxPointersSeen = 0;
    this.axisDecided = false;
    this.axisLocked = false;
  }

  protected override onFail(): void {
    this.axisDecided = false;
    this.axisLocked = false;
  }

  private matchesDirectionFilter(direction: CardinalDirection, axis: GestureAxis): boolean {
    const filter = this.directionFilter;
    if (filter === 'all') return true;
    if (filter === 'horizontal' || filter === 'vertical') return axis === filter;
    return direction === filter;
  }
}
