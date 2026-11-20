export interface Point {
  readonly x: number;
  readonly y: number;
}

export type MotionAction = 'down' | 'pointer_down' | 'move' | 'pointer_up' | 'up' | 'cancel';

export interface PointerSample {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Coalesced intermediate hardware sample for the moving pointer (`actionIndex`)
 * during a `'move'` event.
 */
export interface HistoricalSample {
  readonly eventTime: number;
  readonly x: number;
  readonly y: number;
}

/** @internal */
export const EMPTY_HISTORY: readonly HistoricalSample[] = [];
const EMPTY_POINTERS: readonly PointerSample[] = [];
export const ZERO_POINT: Point = {x: 0, y: 0};

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Computes the arithmetic mean `{x, y}` of `points` (`ZERO_POINT` when empty). */
export function centroid(points: readonly Point[]): Point {
  if (points.length === 0) {
    return ZERO_POINT;
  }
  if (points.length === 1) {
    return {x: points[0].x, y: points[0].y};
  }
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {x: sumX / points.length, y: sumY / points.length};
}

export interface MotionEventInit {
  readonly action: MotionAction;
  readonly eventTime: number;
  readonly actionIndex: number;
  readonly pointerType: string;
  readonly pointers: readonly PointerSample[];
  readonly history?: readonly HistoricalSample[];
  readonly originalEvent: Event;
}

/**
 * Immutable multi-pointer snapshot inspired by Android's `android.view.MotionEvent`.
 *
 * Bridges per-pointer DOM `PointerEvent` notifications into unified multi-pointer
 * state with coalesced history on the moving pointer, jump-free focal point
 * continuity across pointer lifts, and multi-pointer span metrics.
 */
export class MotionEvent {
  readonly action: MotionAction;
  readonly eventTime: number;
  readonly actionIndex: number;
  readonly pointerType: string;
  readonly pointers: readonly PointerSample[];
  readonly history: readonly HistoricalSample[];
  /**
   * DOM event that produced this snapshot: the `PointerEvent` for pointer-driven actions, or the
   * triggering `blur` / `visibilitychange` / `contextmenu` / `pointermove` event for a system `cancel`.
   */
  readonly originalEvent: Event;
  readonly focus: Point;

  private cachedSpan: number | null = null;
  private cachedActivePointers: readonly PointerSample[] | null = null;

  constructor(init: MotionEventInit) {
    this.action = init.action;
    this.eventTime = init.eventTime;
    this.actionIndex = init.actionIndex;
    this.pointerType = init.pointerType;
    this.pointers = init.pointers;
    this.history = init.history ?? EMPTY_HISTORY;
    this.originalEvent = init.originalEvent;
    this.focus = this.computeFocus();
  }

  /** Number of pointers remaining on screen after this event. */
  get activePointerCount(): number {
    if (this.action === 'up' || this.action === 'cancel') {
      return 0;
    }
    if (this.action === 'pointer_up') {
      return Math.max(0, this.pointers.length - 1);
    }
    return this.pointers.length;
  }

  /** `pointerId` of the pointer that triggered this event. */
  get actionPointerId(): number {
    return this.pointers[this.actionIndex]?.pointerId ?? -1;
  }

  findPointerIndex(pointerId: number): number {
    return this.pointers.findIndex(p => p.pointerId === pointerId);
  }

  /**
   * Euclidean mean-deviation span across active pointers (`0` when `< 2` active pointers),
   * matching Android's `ScaleGestureDetector` (`hypot(|x1 - x0|, |y1 - y0|)` for 2 pointers, generalizing to 3+).
   */
  getSpan(): number {
    return (this.cachedSpan ??= this.computeSpan());
  }

  /** Active pointers remaining on the surface (excluding `actionIndex` during `'pointer_up'`). */
  getActivePointers(): readonly PointerSample[] {
    if (this.action === 'up' || this.action === 'cancel') {
      return EMPTY_POINTERS;
    }
    if (this.action === 'pointer_up') {
      return (this.cachedActivePointers ??= this.pointers.filter(
        (_, idx) => idx !== this.actionIndex
      ));
    }
    return this.pointers;
  }

  private computeFocus(): Point {
    const pts =
      this.action === 'pointer_up' && this.pointers.length > 1
        ? this.getActivePointers()
        : this.pointers;
    return centroid(pts);
  }

  private computeSpan(): number {
    const active = this.getActivePointers();
    if (active.length < 2) {
      return 0;
    }
    let devSumX = 0;
    let devSumY = 0;
    for (const p of active) {
      devSumX += Math.abs(p.x - this.focus.x);
      devSumY += Math.abs(p.y - this.focus.y);
    }
    return Math.hypot((devSumX / active.length) * 2, (devSumY / active.length) * 2);
  }
}
