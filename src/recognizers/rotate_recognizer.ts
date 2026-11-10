import {MotionAction, type MotionEvent} from '../motion_event';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';
import {ScaleRecognizer} from './scale_recognizer';

export interface RotateOptions {
  /** Angular change in degrees required before rotation begins. */
  rotationSlop: number;
  /** Minimum pointer span in pixels required to evaluate angle reliably. */
  minSpan: number;
  /** Recognize simultaneously with `ScaleRecognizer` by default. Default: `true`. */
  simultaneousWithScale: boolean;
}

export interface RotateEventData extends GestureEventData {
  /** Cumulative post-slop rotation in degrees since gesture start (unwrapped across +/-180 deg). */
  readonly rotation: number;
  /** Incremental rotation in degrees since the previous rotation update. */
  readonly rotationDelta: number;
}

export interface RotateCallbacks {
  onRotateStart?: (data: RotateEventData) => void;
  onRotate?: (data: RotateEventData) => void;
  onRotateEnd?: (data: RotateEventData) => void;
  onRotateCancel?: () => void;
}

function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  let delta = (toDeg - fromDeg) % 360;
  if (delta > 180) {
    delta -= 360;
  } else if (delta <= -180) {
    delta += 360;
  }
  return delta;
}

export class RotateRecognizer extends GestureRecognizer {
  readonly type = 'rotate';

  private readonly callbacks: RotateCallbacks;
  private readonly userOptions: Partial<RotateOptions>;

  private trackedPair: [number, number] | null = null;
  private prevAngle = 0;
  private rawPreSlopRotation = 0;
  private totalRotation = 0;

  constructor(callbacks: RotateCallbacks, options: Partial<RotateOptions> = {}) {
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

  get simultaneousWithScale(): boolean {
    return this.userOptions.simultaneousWithScale ?? true;
  }

  private get rotationSlop(): number {
    return this.userOptions.rotationSlop ?? this.config.rotationSlop;
  }

  private get minSpan(): number {
    return this.userOptions.minSpan ?? this.config.minScalingSpan;
  }

  override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    if (other instanceof ScaleRecognizer) {
      if (this.simultaneousWithScale && other.simultaneousWithRotate) {
        return true;
      }
    }
    return super.canRecognizeSimultaneouslyWith(other);
  }

  protected override canRearmOnPointerDown(event: MotionEvent): boolean {
    return event.activePointerCount >= 2;
  }

  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case MotionAction.DOWN: {
        this.rawPreSlopRotation = 0;
        this.totalRotation = 0;
        this.anchorPointerPair(event);
        break;
      }

      case MotionAction.POINTER_DOWN: {
        this.anchorPointerPair(event);
        break;
      }

      case MotionAction.MOVE: {
        if (event.activePointerCount < 2 || event.getSpan() < this.minSpan) {
          return;
        }

        const currentAngle = this.readPairAngle(event);
        if (currentAngle === null) {
          this.anchorPointerPair(event);
          return;
        }

        const stepDeg = shortestAngleDelta(this.prevAngle, currentAngle);
        this.prevAngle = currentAngle;
        if (stepDeg === 0) {
          return;
        }

        if (!this.active) {
          this.rawPreSlopRotation += stepDeg;
          if (Math.abs(this.rawPreSlopRotation) <= this.rotationSlop) {
            return;
          }

          // Subtract `rotationSlop` so `onRotateStart` begins cleanly at `0` degrees
          // and `onRotate` grows smoothly from `0` without snapping.
          const postSlopDeg =
            this.rawPreSlopRotation - Math.sign(this.rawPreSlopRotation) * this.rotationSlop;
          this.totalRotation = 0;

          const started = this.tryBegin(() => {
            if (this.callbacks.onRotateStart) {
              this.callbacks.onRotateStart(this.buildEventData(event, 0));
            }
          });

          if (started && postSlopDeg !== 0) {
            this.totalRotation = postSlopDeg;
            if (this.callbacks.onRotate) {
              this.emitChange(() => {
                this.callbacks.onRotate?.(this.buildEventData(event, postSlopDeg));
              });
            }
          }
          return;
        }

        this.totalRotation += stepDeg;
        this.emitChange(() => {
          if (this.callbacks.onRotate) {
            this.callbacks.onRotate(this.buildEventData(event, stepDeg));
          }
        });
        break;
      }

      case MotionAction.POINTER_UP: {
        if (event.activePointerCount < 2) {
          if (this.active) {
            const endPayload = this.buildEventData(event, 0);
            this.completeActive(() => {
              this.callbacks.onRotateEnd?.(endPayload);
            });
          } else {
            this.fail();
          }
          return;
        }
        this.anchorPointerPair(event);
        break;
      }

      case MotionAction.UP: {
        if (this.active) {
          const endPayload = this.buildEventData(event, 0);
          this.completeActive(() => {
            this.callbacks.onRotateEnd?.(endPayload);
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
    this.callbacks.onRotateCancel?.();
  }

  protected override onReset(): void {
    this.trackedPair = null;
    this.prevAngle = 0;
    this.rawPreSlopRotation = 0;
    this.totalRotation = 0;
  }

  private anchorPointerPair(event: MotionEvent): void {
    const active = event.getActivePointers();
    if (active.length < 2) {
      this.trackedPair = null;
      return;
    }
    this.trackedPair = [active[0].pointerId, active[1].pointerId];
    const dx = active[1].x - active[0].x;
    const dy = active[1].y - active[0].y;
    this.prevAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private readPairAngle(event: MotionEvent): number | null {
    if (!this.trackedPair) {
      return null;
    }
    const idx0 = event.findPointerIndex(this.trackedPair[0]);
    const idx1 = event.findPointerIndex(this.trackedPair[1]);
    if (idx0 === -1 || idx1 === -1) {
      return null;
    }
    const p0 = event.pointers[idx0];
    const p1 = event.pointers[idx1];
    return Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
  }

  private buildEventData(event: MotionEvent, rotationDelta: number): RotateEventData {
    return {
      ...this.createEventData(event),
      rotation: this.totalRotation,
      rotationDelta,
    };
  }
}
