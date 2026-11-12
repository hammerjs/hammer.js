import {
  MotionAction,
  type MotionEvent,
  type Point,
  type PointerSample,
  ZERO_POINT,
} from './motion_event.js';

const HISTORY_CAPACITY = 20;
const HORIZON_MS = 100;
const ASSUME_STOPPED_MS = 40;
const SINGULAR_DET_EPSILON = 1e-12;

/**
 * Per-pointer circular buffer storing `(timeMs, x, y)` samples and estimating 2D
 * velocity via Android AOSP's default unweighted 2nd-order polynomial least-squares
 * fit (`LSQ2`, with 2-sample linear fallback) in zero heap allocations.
 */
class PointerVelocityBuffer {
  private readonly times = new Float64Array(HISTORY_CAPACITY);
  private readonly xs = new Float64Array(HISTORY_CAPACITY);
  private readonly ys = new Float64Array(HISTORY_CAPACITY);
  private head = 0;
  private size = 0;

  computed: Point = ZERO_POINT;

  add(timeMs: number, x: number, y: number): void {
    if (this.size > 0) {
      const dt = timeMs - this.times[this.head];
      if (dt > ASSUME_STOPPED_MS || dt < 0) {
        this.clear();
      } else if (dt === 0) {
        this.xs[this.head] = x;
        this.ys[this.head] = y;
        return;
      }
    }

    this.head = (this.head + 1) % HISTORY_CAPACITY;
    this.times[this.head] = timeMs;
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    if (this.size < HISTORY_CAPACITY) {
      this.size++;
    }
  }

  notifyPointerUp(timeMs: number, x: number, y: number): void {
    if (this.size === 0) {
      return;
    }
    const dt = timeMs - this.times[this.head];
    if (dt > ASSUME_STOPPED_MS || dt < 0) {
      this.clear();
      return;
    }
    // Only record liftoff coordinates when no `pointermove` arrived (`size < 2`);
    // when move samples exist, ignore capacitive finger peel-off shifts (matching AOSP).
    if (this.size < 2 && dt > 0 && (x !== this.xs[this.head] || y !== this.ys[this.head])) {
      this.add(timeMs, x, y);
    }
  }

  computeVelocity(referenceTimeMs?: number): Point {
    if (this.size < 2) {
      return ZERO_POINT;
    }

    const newestTime = this.times[this.head];
    if (referenceTimeMs !== undefined && referenceTimeMs - newestTime > ASSUME_STOPPED_MS) {
      return ZERO_POINT;
    }

    let oldestIdx = this.head;
    let count = 0;

    for (let i = 0; i < this.size; i++) {
      const idx = (this.head - i + HISTORY_CAPACITY) % HISTORY_CAPACITY;
      if (newestTime - this.times[idx] > HORIZON_MS) {
        break;
      }
      oldestIdx = idx;
      count++;
    }

    const x0 = this.xs[this.head];
    const y0 = this.ys[this.head];
    const spanSec = (newestTime - this.times[oldestIdx]) / 1000;

    if (count === 2) {
      return {
        x: (x0 - this.xs[oldestIdx]) / spanSec,
        y: (y0 - this.ys[oldestIdx]) / spanSec,
      };
    }

    // Closed-form 2nd-order polynomial fit `d(tau) = b0 + b1*tau + b2*tau^2` for `tau in [-1, 0]`,
    // sharing the 3x3 Hankel matrix `s0..s4` and determinant `det` across both X and Y axes.
    const s0 = count;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;
    let bx0 = 0;
    let bx1 = 0;
    let bx2 = 0;
    let by0 = 0;
    let by1 = 0;
    let by2 = 0;

    for (let i = 0; i < count; i++) {
      const idx = (this.head - i + HISTORY_CAPACITY) % HISTORY_CAPACITY;
      const tau = (this.times[idx] - newestTime) / 1000 / spanSec;
      const tau2 = tau * tau;
      const dx = this.xs[idx] - x0;
      const dy = this.ys[idx] - y0;

      s1 += tau;
      s2 += tau2;
      s3 += tau2 * tau;
      s4 += tau2 * tau2;

      bx0 += dx;
      bx1 += tau * dx;
      bx2 += tau2 * dx;

      by0 += dy;
      by1 += tau * dy;
      by2 += tau2 * dy;
    }

    const c00 = s2 * s4 - s3 * s3;
    const c01 = s1 * s4 - s2 * s3;
    const c02 = s1 * s3 - s2 * s2;
    const det = s0 * c00 - s1 * c01 + s2 * c02;

    if (Math.abs(det) <= SINGULAR_DET_EPSILON) {
      return {
        x: (x0 - this.xs[oldestIdx]) / spanSec,
        y: (y0 - this.ys[oldestIdx]) / spanSec,
      };
    }

    const detX = s0 * (bx1 * s4 - s3 * bx2) - bx0 * c01 + s2 * (s1 * bx2 - bx1 * s2);
    const detY = s0 * (by1 * s4 - s3 * by2) - by0 * c01 + s2 * (s1 * by2 - by1 * s2);

    return {
      x: detX / det / spanSec,
      y: detY / det / spanSec,
    };
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
    this.computed = ZERO_POINT;
  }
}

function clampVelocityRadially(vx: number, vy: number, maxVelocity: number): Point {
  const x = Number.isFinite(vx) ? vx : 0;
  const y = Number.isFinite(vy) ? vy : 0;
  if (maxVelocity <= 0 || (x === 0 && y === 0)) {
    return ZERO_POINT;
  }
  if (!Number.isFinite(maxVelocity)) {
    return {x, y};
  }
  const speed = Math.hypot(x, y);
  if (speed > maxVelocity) {
    const ratio = maxVelocity / speed;
    return {x: x * ratio, y: y * ratio};
  }
  return {x, y};
}

/**
 * Multi-pointer 2nd-order least-squares (`LSQ2`) velocity tracker modeled after
 * Android's `android.view.VelocityTracker`.
 */
export class VelocityTracker {
  private readonly pointers = new Map<number, PointerVelocityBuffer>();

  private activePointerId: number | null = null;
  private latestEventTime: number | undefined = undefined;
  private dirty = false;
  private cachedMaxVelocity = Number.POSITIVE_INFINITY;

  /**
   * Feeds a `MotionEvent` (including coalesced intermediate samples for the moving
   * pointer) into per-pointer velocity buffers.
   */
  addMovement(event: MotionEvent): void {
    this.recordTimestamp(event.eventTime);

    switch (event.action) {
      case MotionAction.DOWN: {
        this.clear();
        this.recordTimestamp(event.eventTime);
        const p = event.pointers[0];
        if (p) {
          this.activePointerId = p.pointerId;
          this.addPoint(p.pointerId, event.eventTime, p.x, p.y);
        }
        break;
      }

      case MotionAction.POINTER_DOWN: {
        const added = event.pointers[event.actionIndex];
        for (const p of event.pointers) {
          if (p === added || !this.pointers.has(p.pointerId)) {
            this.clearPointer(p.pointerId);
            this.addPoint(p.pointerId, event.eventTime, p.x, p.y);
          }
        }
        break;
      }

      case MotionAction.MOVE: {
        const moved = event.pointers[event.actionIndex];
        if (!moved) {
          break;
        }
        for (const sample of event.history) {
          this.addPoint(moved.pointerId, sample.eventTime, sample.x, sample.y);
        }
        this.addPoint(moved.pointerId, event.eventTime, moved.x, moved.y);
        break;
      }

      case MotionAction.POINTER_UP: {
        const lifted = event.pointers[event.actionIndex];
        if (lifted) {
          const buf = this.pointers.get(lifted.pointerId);
          if (buf) {
            buf.notifyPointerUp(event.eventTime, lifted.x, lifted.y);
            this.dirty = true;
          }
          if (this.activePointerId === lifted.pointerId) {
            const remaining = event.getActivePointers();
            this.activePointerId = remaining.length > 0 ? remaining[0].pointerId : null;
          }
        }
        break;
      }

      case MotionAction.UP: {
        const lifted = event.pointers[event.actionIndex] ?? event.pointers[0];
        if (lifted) {
          const buf = this.pointers.get(lifted.pointerId);
          if (buf) {
            buf.notifyPointerUp(event.eventTime, lifted.x, lifted.y);
            this.dirty = true;
          }
          this.activePointerId = lifted.pointerId;
        }
        break;
      }

      case MotionAction.CANCEL: {
        this.clear();
        break;
      }
    }
  }

  /**
   * Applies Android `GestureDetector`'s `POINTER_UP` opposing-vector cancellation
   * after recognizers inspect `POINTER_UP` so lifting one finger from a pinch clears
   * residual velocity without starving 2-pointer `onPanEnd` handlers.
   */
  finalizePointerUp(event: MotionEvent, maxVelocity = Number.POSITIVE_INFINITY): void {
    if (event.action !== MotionAction.POINTER_UP) {
      return;
    }
    const upId = event.actionPointerId;
    if (this.hasOpposingVelocity(upId, event.getActivePointers(), maxVelocity)) {
      this.clear();
    } else {
      this.clearPointer(upId);
    }
  }

  /**
   * Computes velocities in `px/s` for all tracked pointers (cached when no new samples arrived).
   * @param maxVelocity Radial upper bound (`hypot(vx, vy) <= maxVelocity`).
   */
  computeCurrentVelocity(maxVelocity = Number.POSITIVE_INFINITY): void {
    if (!this.dirty && this.cachedMaxVelocity === maxVelocity) {
      return;
    }

    for (const buf of this.pointers.values()) {
      const raw = buf.computeVelocity(this.latestEventTime);
      buf.computed = clampVelocityRadially(raw.x, raw.y, maxVelocity);
    }

    this.dirty = false;
    this.cachedMaxVelocity = maxVelocity;
  }

  getVelocity(pointerId?: number): Point {
    const id = pointerId ?? this.activePointerId;
    return id === null ? ZERO_POINT : (this.pointers.get(id)?.computed ?? ZERO_POINT);
  }

  /** Computes focal-point (centroid) velocity in `px/s` averaged across `pointers`. */
  getCentroidVelocity(pointers: readonly PointerSample[]): Point {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const p of pointers) {
      const buf = this.pointers.get(p.pointerId);
      if (!buf) continue;
      sumX += buf.computed.x;
      sumY += buf.computed.y;
      count++;
    }

    if (count === 0 || (sumX === 0 && sumY === 0)) {
      return ZERO_POINT;
    }

    return {x: sumX / count, y: sumY / count};
  }

  clear(): void {
    this.pointers.clear();
    this.activePointerId = null;
    this.latestEventTime = undefined;
    this.dirty = false;
  }

  private addPoint(pointerId: number, timeMs: number, x: number, y: number): void {
    this.recordTimestamp(timeMs);
    let buf = this.pointers.get(pointerId);
    if (!buf) {
      buf = new PointerVelocityBuffer();
      this.pointers.set(pointerId, buf);
    }
    if (this.activePointerId === null) {
      this.activePointerId = pointerId;
    }
    buf.add(timeMs, x, y);
    this.dirty = true;
  }

  private hasOpposingVelocity(
    upPointerId: number,
    remaining: readonly PointerSample[],
    maxVelocity: number
  ): boolean {
    this.computeCurrentVelocity(maxVelocity);
    const v1 = this.getVelocity(upPointerId);

    for (const other of remaining) {
      if (other.pointerId === upPointerId) continue;
      const v2 = this.getVelocity(other.pointerId);
      if (v1.x * v2.x + v1.y * v2.y < 0) {
        return true;
      }
    }
    return false;
  }

  private clearPointer(pointerId: number): void {
    if (this.pointers.delete(pointerId)) {
      this.dirty = true;
    }
    if (this.activePointerId === pointerId) {
      const next = this.pointers.keys().next();
      this.activePointerId = next.done ? null : next.value;
    }
  }

  private recordTimestamp(timeMs: number): void {
    if (this.latestEventTime !== timeMs) {
      this.latestEventTime = timeMs;
      this.dirty = true;
    }
  }
}
