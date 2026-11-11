import {MotionAction, type MotionEvent} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';

export interface RotateOptions {
  /** Angular change in degrees required before rotation begins. */
  rotationSlop: number;
  /** Minimum pointer span in pixels required to evaluate angle reliably. */
  minSpan: number;
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

  private callbacks: RotateCallbacks;
  private readonly userOptions: Partial<RotateOptions>;

  private trackedPair: [number, number] | null = null;
  private pairAnchored = false;
  private prevAngle = 0;
  private rawPreSlopRotation = 0;
  private totalRotation = 0;

  constructor(callbacks: RotateCallbacks, options: Partial<RotateOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
  }

  setCallbacks(callbacks: RotateCallbacks): this {
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

  private get rotationSlop(): number {
    return this.userOptions.rotationSlop ?? this.config.rotationSlop;
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
        this.rawPreSlopRotation = 0;
        this.totalRotation = 0;
        this.anchorPointerPair(event);
        break;
      }

      case MotionAction.POINTER_DOWN: {
        if (!this.active) {
          this.rawPreSlopRotation = 0;
        }
        this.anchorPointerPair(event);
        break;
      }

      case MotionAction.MOVE: {
        if (event.activePointerCount < 2) {
          return;
        }
        if (!this.trackedPair) {
          this.anchorPointerPair(event);
          return;
        }
        const idx0 = event.findPointerIndex(this.trackedPair[0]);
        const idx1 = event.findPointerIndex(this.trackedPair[1]);
        if (idx0 === -1 || idx1 === -1) {
          this.anchorPointerPair(event);
          return;
        }

        const dx = event.pointers[idx1].x - event.pointers[idx0].x;
        const dy = event.pointers[idx1].y - event.pointers[idx0].y;
        if (Math.hypot(dx, dy) < Math.max(1, this.minSpan)) {
          // Wait to anchor angle until the tracked pair separates past `minSpan` so pinching
          // outward from close proximity starts cleanly at 0 deg instead of snapping.
          this.pairAnchored = false;
          if (!this.active) {
            this.rawPreSlopRotation = 0;
          }
          return;
        }

        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (!this.pairAnchored) {
          this.prevAngle = currentAngle;
          this.pairAnchored = true;
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
            this.callbacks.onRotateStart?.(this.buildEventData(event, 0));
          });

          if (started) {
            this.totalRotation = postSlopDeg;
            this.emitChange(() => {
              this.callbacks.onRotate?.(this.buildEventData(event, postSlopDeg));
            });
          }
          return;
        }

        this.totalRotation += stepDeg;
        this.emitChange(() => {
          this.callbacks.onRotate?.(this.buildEventData(event, stepDeg));
        });
        break;
      }

      case MotionAction.POINTER_UP: {
        if (event.activePointerCount < 2) {
          if (this.active) {
            this.completeActive(() => {
              this.callbacks.onRotateEnd?.(this.buildEventData(event, 0));
            });
          } else {
            this.fail();
          }
          return;
        }
        if (!this.active) {
          this.rawPreSlopRotation = 0;
        }
        this.anchorPointerPair(event);
        break;
      }

      case MotionAction.UP: {
        // An active rotation always ends on the preceding `POINTER_UP` (fewer than 2 pointers).
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
    this.callbacks.onRotateCancel?.();
  }

  protected override onReset(): void {
    this.trackedPair = null;
    this.pairAnchored = false;
    this.prevAngle = 0;
    this.rawPreSlopRotation = 0;
    this.totalRotation = 0;
  }

  private anchorPointerPair(event: MotionEvent): void {
    const active = event.getActivePointers();
    if (active.length < 2) {
      this.trackedPair = null;
      this.pairAnchored = false;
      return;
    }
    this.trackedPair = [active[0].pointerId, active[1].pointerId];
    const dx = active[1].x - active[0].x;
    const dy = active[1].y - active[0].y;
    if (Math.hypot(dx, dy) >= Math.max(1, this.minSpan)) {
      this.prevAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      this.pairAnchored = true;
    } else {
      this.pairAnchored = false;
    }
  }

  private buildEventData(event: MotionEvent, rotationDelta: number): RotateEventData {
    return {
      ...this.createEventData(event),
      rotation: this.totalRotation,
      rotationDelta,
    };
  }
}
