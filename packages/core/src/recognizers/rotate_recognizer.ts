import {createDescriptor, type GestureDescriptor} from '../descriptors.js';
import {centroid, distance, type MotionEvent, type Point} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_action.js';

const DEFAULT_ROTATION_SLOP = 5;
const DEFAULT_MIN_SPAN = 27;

export interface RotateOptions {
  /** Angular change in degrees required before rotation begins. Default: `5`. */
  rotationSlop: number;
  /** Minimum pointer span in pixels required to evaluate angle reliably. Default: `27`. */
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

function angleDeg(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
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
  private readonly callbacks: RotateCallbacks;
  private readonly rotationSlop: number;
  private readonly minSpan: number;

  private trackedPair: [number, number] | null = null;
  private pairAnchored = false;
  private prevAngle = 0;
  private rawPreSlopRotation = 0;
  private totalRotation = 0;

  constructor(callbacks: RotateCallbacks, options: Partial<RotateOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.rotationSlop = Math.max(0, options.rotationSlop ?? DEFAULT_ROTATION_SLOP);
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
    this.rawPreSlopRotation = 0;
    this.totalRotation = 0;
    this.anchorPointerPair(event);
  }

  protected override onPointerDown(event: MotionEvent): void {
    if (!this.active) {
      this.rawPreSlopRotation = 0;
    }
    this.anchorPointerPair(event);
  }

  protected override onMove(event: MotionEvent): void {
    if (event.activePointerCount < 2 || !this.trackedPair) {
      return;
    }
    const idx0 = event.findPointerIndex(this.trackedPair[0]);
    const idx1 = event.findPointerIndex(this.trackedPair[1]);
    if (idx0 === -1 || idx1 === -1) {
      this.anchorPointerPair(event);
      return;
    }

    const p0 = event.pointers[idx0];
    const p1 = event.pointers[idx1];
    if (distance(p0, p1) < this.minSpan) {
      // Wait to anchor angle until the tracked pair separates past `minSpan` so pinching
      // outward from close proximity starts cleanly at 0 deg instead of snapping.
      this.pairAnchored = false;
      if (!this.active) {
        this.rawPreSlopRotation = 0;
      }
      return;
    }

    const currentAngle = angleDeg(p0, p1);
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

    let emitDeg = stepDeg;
    if (!this.active) {
      this.rawPreSlopRotation += stepDeg;
      if (Math.abs(this.rawPreSlopRotation) <= this.rotationSlop) {
        return;
      }

      // Subtract `rotationSlop` so `onRotateStart` begins cleanly at `0` degrees
      // and `onRotate` grows smoothly from `0` without snapping.
      emitDeg = this.rawPreSlopRotation - Math.sign(this.rawPreSlopRotation) * this.rotationSlop;
      this.totalRotation = 0;

      const started = this.tryBegin(() => {
        if (this.callbacks.onRotateStart) {
          this.callbacks.onRotateStart(this.buildEventData(event, 0));
        }
      });
      if (!started) {
        return;
      }
    }

    if (this.emitChange()) {
      this.totalRotation += emitDeg;
      if (this.callbacks.onRotate) {
        this.callbacks.onRotate(this.buildEventData(event, emitDeg));
      }
    }
  }

  protected override onPointerUp(event: MotionEvent): void {
    if (event.activePointerCount < 2) {
      if (this.completeActive()) {
        if (this.callbacks.onRotateEnd) {
          this.callbacks.onRotateEnd(this.buildEventData(event, 0, centroid(event.pointers)));
        }
      } else {
        this.fail();
      }
      return;
    }
    if (!this.active) {
      this.rawPreSlopRotation = 0;
    }
    this.anchorPointerPair(event);
  }

  protected override onUp(): void {
    // An active rotation always ends on the preceding `'pointer_up'` (fewer than 2 pointers).
    this.fail();
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
    if (distance(active[0], active[1]) >= this.minSpan) {
      this.prevAngle = angleDeg(active[0], active[1]);
      this.pairAnchored = true;
    } else {
      this.pairAnchored = false;
    }
  }

  private buildEventData(
    event: MotionEvent,
    rotationDelta: number,
    centerOverride?: Point
  ): RotateEventData {
    return {
      center: centerOverride ?? event.focus,
      motionEvent: event,
      originalEvent: event.originalEvent,
      rotation: this.totalRotation,
      rotationDelta,
    };
  }
}

export type RotateGestureOptions = Partial<RotateOptions> & RotateCallbacks;

/** Creates a tree-shakable `RotateRecognizer` descriptor (multi-pointer rotation). */
export function rotate(options?: RotateGestureOptions): GestureDescriptor {
  return createDescriptor(
    'rotate',
    options as Record<string, unknown> | undefined,
    (cbs, cfg) => new RotateRecognizer(cbs as RotateCallbacks, cfg as Partial<RotateOptions>)
  );
}
