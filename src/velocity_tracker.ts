import {MotionAction, type MotionEvent, type Point, type PointerSample} from './motion_event';

const HISTORY_CAPACITY = 20;
const DEFAULT_HORIZON_MS = 100;
const DEFAULT_ASSUME_STOPPED_MS = 40;
const SINGULAR_DET_EPSILON = 1e-12;

export interface VelocityTrackerOptions {
  /** Rolling lookback window in `ms`. Samples older than this relative to newest are ignored. Default: `100`. */
  readonly horizonMs?: number;
  /** Silence threshold in `ms` after which a pointer is assumed stopped and history resets. Default: `40`. */
  readonly assumePointerStoppedMs?: number;
}

export interface VelocityVector extends Point {
  readonly speed: number;
}

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

  computedVx = 0;
  computedVy = 0;

  add(timeMs: number, x: number, y: number, assumePointerStoppedMs: number): void {
    if (this.size > 0) {
      const dt = timeMs - this.times[this.head];
      if (dt > assumePointerStoppedMs || dt < 0) {
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

  notifyPointerUp(timeMs: number, x: number, y: number, assumePointerStoppedMs: number): void {
    if (this.size === 0) {
      return;
    }
    const dt = timeMs - this.times[this.head];
    if (dt > assumePointerStoppedMs || dt < 0) {
      this.clear();
      return;
    }
    if (dt > 0 && (x !== this.xs[this.head] || y !== this.ys[this.head])) {
      this.add(timeMs, x, y, assumePointerStoppedMs);
    }
  }

  computeVelocity(
    horizonMs: number,
    assumePointerStoppedMs: number,
    referenceTimeMs?: number
  ): {vx: number; vy: number} {
    if (this.size < 2) {
      return {vx: 0, vy: 0};
    }

    const newestTime = this.times[this.head];
    if (referenceTimeMs !== undefined && referenceTimeMs - newestTime > assumePointerStoppedMs) {
      return {vx: 0, vy: 0};
    }

    let prevTime = newestTime;
    let oldestIdx = this.head;
    let count = 0;

    for (let i = 0; i < this.size; i++) {
      const idx = (this.head - i + HISTORY_CAPACITY) % HISTORY_CAPACITY;
      const sampleTime = this.times[idx];
      if (newestTime - sampleTime > horizonMs || prevTime - sampleTime > assumePointerStoppedMs) {
        break;
      }
      oldestIdx = idx;
      prevTime = sampleTime;
      count++;
    }

    if (count < 2) {
      return {vx: 0, vy: 0};
    }

    const x0 = this.xs[this.head];
    const y0 = this.ys[this.head];
    const spanSec = (newestTime - this.times[oldestIdx]) / 1000;

    if (count === 2) {
      return {
        vx: (x0 - this.xs[oldestIdx]) / spanSec,
        vy: (y0 - this.ys[oldestIdx]) / spanSec,
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
        vx: (x0 - this.xs[oldestIdx]) / spanSec,
        vy: (y0 - this.ys[oldestIdx]) / spanSec,
      };
    }

    const detX = s0 * (bx1 * s4 - s3 * bx2) - bx0 * c01 + s2 * (s1 * bx2 - bx1 * s2);
    const detY = s0 * (by1 * s4 - s3 * by2) - by0 * c01 + s2 * (s1 * by2 - by1 * s2);

    return {
      vx: detX / det / spanSec,
      vy: detY / det / spanSec,
    };
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
    this.computedVx = 0;
    this.computedVy = 0;
  }
}

function clampVelocityRadially(
  vx: number,
  vy: number,
  maxVelocity: number
): {vx: number; vy: number} {
  const cleanX = Number.isFinite(vx) ? vx : 0;
  const cleanY = Number.isFinite(vy) ? vy : 0;
  if (maxVelocity <= 0) {
    return {vx: 0, vy: 0};
  }
  if (!Number.isFinite(maxVelocity)) {
    return {vx: cleanX, vy: cleanY};
  }
  const speed = Math.hypot(cleanX, cleanY);
  if (speed > maxVelocity) {
    const ratio = maxVelocity / speed;
    return {vx: cleanX * ratio, vy: cleanY * ratio};
  }
  return {vx: cleanX, vy: cleanY};
}

/**
 * Multi-pointer 2nd-order least-squares (`LSQ2`) velocity tracker modeled after
 * Android's `android.view.VelocityTracker`.
 */
export class VelocityTracker {
  private readonly pointers = new Map<number, PointerVelocityBuffer>();
  private readonly horizonMs: number;
  private readonly assumePointerStoppedMs: number;

  private activePointerId: number | null = null;
  private latestEventTime: number | undefined = undefined;
  private dirty = false;
  private cachedUnits = 1000;
  private cachedMaxVelocity = Number.POSITIVE_INFINITY;

  constructor(options: VelocityTrackerOptions = {}) {
    this.horizonMs = options.horizonMs ?? DEFAULT_HORIZON_MS;
    this.assumePointerStoppedMs = options.assumePointerStoppedMs ?? DEFAULT_ASSUME_STOPPED_MS;
  }

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
        const p = event.pointers[event.actionIndex];
        if (p) {
          this.clearPointer(p.pointerId);
          this.addPoint(p.pointerId, event.eventTime, p.x, p.y);
        }
        break;
      }

      case MotionAction.MOVE: {
        const moved = event.pointers[event.actionIndex];
        if (!moved) {
          break;
        }
        for (let h = 0; h < event.history.length; h++) {
          const sample = event.history[h];
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
            buf.notifyPointerUp(event.eventTime, lifted.x, lifted.y, this.assumePointerStoppedMs);
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
            buf.notifyPointerUp(event.eventTime, lifted.x, lifted.y, this.assumePointerStoppedMs);
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
   * Feeds `event` into `addMovement(event)` and applies Android `GestureDetector`'s
   * `POINTER_UP` opposing-vector cancellation so lifting one finger from a pinch
   * clears residual velocity instead of misfiring a fling.
   */
  recordStreamEvent(event: MotionEvent, maxFlingVelocity = Number.POSITIVE_INFINITY): void {
    this.addMovement(event);
    if (event.action === MotionAction.POINTER_UP) {
      const upId = event.actionPointerId;
      if (this.hasOpposingVelocity(upId, event.getActivePointers(), maxFlingVelocity)) {
        this.clear();
      } else {
        this.clearPointer(upId);
      }
    }
  }

  /** Directly records a single `(x, y)` sample at `timeMs` for `pointerId`. */
  addPoint(pointerId: number, timeMs: number, x: number, y: number): void {
    this.recordTimestamp(timeMs);
    let buf = this.pointers.get(pointerId);
    if (!buf) {
      buf = new PointerVelocityBuffer();
      this.pointers.set(pointerId, buf);
    }
    if (this.activePointerId === null) {
      this.activePointerId = pointerId;
    }
    buf.add(timeMs, x, y, this.assumePointerStoppedMs);
    this.dirty = true;
  }

  /**
   * Computes velocities for all tracked pointers (cached when no new samples arrived).
   * @param units `1000` (default) for `px/s`, `1` for `px/ms`.
   * @param maxVelocity Radial upper bound (`hypot(vx, vy) <= maxVelocity`).
   */
  computeCurrentVelocity(units = 1000, maxVelocity = Number.POSITIVE_INFINITY): void {
    if (!this.dirty && this.cachedUnits === units && this.cachedMaxVelocity === maxVelocity) {
      return;
    }

    const unitScale = units / 1000;
    for (const buf of this.pointers.values()) {
      const raw = buf.computeVelocity(
        this.horizonMs,
        this.assumePointerStoppedMs,
        this.latestEventTime
      );
      const clamped = clampVelocityRadially(raw.vx * unitScale, raw.vy * unitScale, maxVelocity);
      buf.computedVx = clamped.vx;
      buf.computedVy = clamped.vy;
    }

    this.dirty = false;
    this.cachedUnits = units;
    this.cachedMaxVelocity = maxVelocity;
  }

  getXVelocity(pointerId?: number): number {
    const id = pointerId ?? this.activePointerId;
    return id === null ? 0 : (this.pointers.get(id)?.computedVx ?? 0);
  }

  getYVelocity(pointerId?: number): number {
    const id = pointerId ?? this.activePointerId;
    return id === null ? 0 : (this.pointers.get(id)?.computedVy ?? 0);
  }

  getVelocity(pointerId?: number): VelocityVector {
    const x = this.getXVelocity(pointerId);
    const y = this.getYVelocity(pointerId);
    return {x, y, speed: Math.hypot(x, y)};
  }

  /**
   * Computes focal-point (centroid) velocity averaged across `pointers` (accepting
   * `pointerId` numbers or `PointerSample`s, or all tracked pointers when omitted).
   */
  getCentroidVelocity(pointers?: readonly (number | PointerSample)[]): VelocityVector {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    if (pointers) {
      for (let i = 0; i < pointers.length; i++) {
        const item = pointers[i];
        const id = typeof item === 'number' ? item : item.pointerId;
        const buf = this.pointers.get(id);
        if (!buf) continue;
        sumX += buf.computedVx;
        sumY += buf.computedVy;
        count++;
      }
    } else {
      for (const buf of this.pointers.values()) {
        sumX += buf.computedVx;
        sumY += buf.computedVy;
        count++;
      }
    }

    if (count === 0) {
      return {x: 0, y: 0, speed: 0};
    }

    const x = sumX / count;
    const y = sumY / count;
    return {x, y, speed: Math.hypot(x, y)};
  }

  /**
   * Returns `true` if `upPointerId`'s velocity vector opposes (`dot < 0`) any
   * remaining pointer's velocity (e.g. two fingers pinching apart or together).
   */
  hasOpposingVelocity(
    upPointerId: number,
    remaining: readonly (number | PointerSample)[],
    maxVelocity = Number.POSITIVE_INFINITY
  ): boolean {
    this.computeCurrentVelocity(1000, maxVelocity);
    const x1 = this.getXVelocity(upPointerId);
    const y1 = this.getYVelocity(upPointerId);

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const otherId = typeof item === 'number' ? item : item.pointerId;
      if (otherId === upPointerId) continue;
      if (x1 * this.getXVelocity(otherId) + y1 * this.getYVelocity(otherId) < 0) {
        return true;
      }
    }
    return false;
  }

  clearPointer(pointerId: number): void {
    if (this.pointers.delete(pointerId)) {
      this.dirty = true;
    }
    if (this.activePointerId === pointerId) {
      const next = this.pointers.keys().next();
      this.activePointerId = next.done ? null : next.value;
    }
  }

  clear(): void {
    this.pointers.clear();
    this.activePointerId = null;
    this.latestEventTime = undefined;
    this.dirty = false;
  }

  private recordTimestamp(timeMs: number): void {
    if (this.latestEventTime !== timeMs) {
      this.latestEventTime = timeMs;
      this.dirty = true;
    }
  }
}
