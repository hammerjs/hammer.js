export interface Point {
  readonly x: number;
  readonly y: number;
}

export const MotionAction = {
  /** First pointer touched the surface; starts a new gesture stream. */
  DOWN: 'down',
  /** An additional pointer touched the surface while at least one is already active. */
  POINTER_DOWN: 'pointer_down',
  /** Active pointer `actionIndex` moved. */
  MOVE: 'move',
  /** A non-final pointer lifted; at least one pointer remains active. */
  POINTER_UP: 'pointer_up',
  /** The final active pointer lifted; concludes the gesture stream. */
  UP: 'up',
  /** The gesture stream was aborted by the browser/OS or pointer capture loss. */
  CANCEL: 'cancel',
} as const;

export type MotionActionType = (typeof MotionAction)[keyof typeof MotionAction];

export interface PointerSample {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}

/**
 * Coalesced intermediate hardware sample for the moving pointer (`actionIndex`)
 * during a `MotionAction.MOVE` event.
 */
export interface HistoricalSample {
  readonly eventTime: number;
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}

const EMPTY_HISTORY: readonly HistoricalSample[] = Object.freeze([]);
const EMPTY_POINTERS: readonly PointerSample[] = Object.freeze([]);

export interface MotionEventInit {
  readonly action: MotionActionType;
  readonly downTime: number;
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
  readonly action: MotionActionType;
  readonly downTime: number;
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

  private cachedSpanX: number | null = null;
  private cachedSpanY: number | null = null;
  private cachedActivePointers: readonly PointerSample[] | null = null;

  constructor(init: MotionEventInit) {
    this.action = init.action;
    this.downTime = init.downTime;
    this.eventTime = init.eventTime;
    this.actionIndex = init.actionIndex;
    this.pointerType = init.pointerType;
    this.pointers = init.pointers;
    this.history = init.history ?? EMPTY_HISTORY;
    this.originalEvent = init.originalEvent;
    this.focus = this.computeFocus();
  }

  /** Total pointers present in this snapshot (includes lifting pointer on `pointer_up`/`up`). */
  get pointerCount(): number {
    return this.pointers.length;
  }

  /** Number of pointers remaining on screen after this event. */
  get activePointerCount(): number {
    if (this.action === MotionAction.UP || this.action === MotionAction.CANCEL) {
      return 0;
    }
    if (this.action === MotionAction.POINTER_UP) {
      return Math.max(0, this.pointers.length - 1);
    }
    return this.pointers.length;
  }

  /** `pointerId` of the pointer that triggered this event. */
  get actionPointerId(): number {
    return this.pointers[this.actionIndex]?.pointerId ?? -1;
  }

  get focusX(): number {
    return this.focus.x;
  }

  get focusY(): number {
    return this.focus.y;
  }

  findPointerIndex(pointerId: number): number {
    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId === pointerId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Computes `point` (defaulting to `this.focus`) in `element`-local CSS coordinates
   * on demand without forcing layout measurement on unqueried move frames.
   */
  relativeTo(element: Element, point: Point = this.focus): Point {
    const rect = element.getBoundingClientRect();
    return {
      x: point.x - rect.left,
      y: point.y - rect.top,
    };
  }

  /**
   * Average horizontal span across active pointers around `focusX` (`2 * mean(|x - focusX|)`),
   * matching Android's `ScaleGestureDetector` (`|x1 - x0|` for 2 pointers, generalizing to 3+).
   */
  getSpanX(): number {
    if (this.cachedSpanX === null) {
      this.computeSpans();
    }
    return this.cachedSpanX!;
  }

  /** Average vertical span across active pointers around `focusY` (`2 * mean(|y - focusY|)`). */
  getSpanY(): number {
    if (this.cachedSpanY === null) {
      this.computeSpans();
    }
    return this.cachedSpanY!;
  }

  /** Euclidean span `hypot(spanX, spanY)` across active pointers (`0` when `< 2` active pointers). */
  getSpan(): number {
    return Math.hypot(this.getSpanX(), this.getSpanY());
  }

  /** Active pointers remaining on the surface (excluding `actionIndex` during `POINTER_UP`). */
  getActivePointers(): readonly PointerSample[] {
    if (this.action === MotionAction.UP || this.action === MotionAction.CANCEL) {
      return EMPTY_POINTERS;
    }
    if (this.action === MotionAction.POINTER_UP) {
      if (this.cachedActivePointers === null) {
        this.cachedActivePointers = this.pointers.filter((_, idx) => idx !== this.actionIndex);
      }
      return this.cachedActivePointers;
    }
    return this.pointers;
  }

  private computeFocus(): Point {
    const n = this.pointers.length;
    if (n === 0) {
      return {x: 0, y: 0};
    }
    if (n === 1) {
      return {x: this.pointers[0].x, y: this.pointers[0].y};
    }

    // Exclude lifting pointer during `POINTER_UP` so remaining pointers become the new focus cleanly.
    const skipIndex = this.action === MotionAction.POINTER_UP ? this.actionIndex : -1;
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      if (i === skipIndex) continue;
      sumX += this.pointers[i].x;
      sumY += this.pointers[i].y;
      count++;
    }

    return {x: sumX / count, y: sumY / count};
  }

  private computeSpans(): void {
    const active = this.getActivePointers();
    if (active.length < 2) {
      this.cachedSpanX = 0;
      this.cachedSpanY = 0;
      return;
    }

    let devSumX = 0;
    let devSumY = 0;
    for (let i = 0; i < active.length; i++) {
      devSumX += Math.abs(active[i].x - this.focus.x);
      devSumY += Math.abs(active[i].y - this.focus.y);
    }

    this.cachedSpanX = (devSumX / active.length) * 2;
    this.cachedSpanY = (devSumY / active.length) * 2;
  }
}

function readTimestamp(e: PointerEvent): number {
  return typeof e.timeStamp === 'number' && Number.isFinite(e.timeStamp)
    ? e.timeStamp
    : performance.now();
}

function toPointerSample(e: PointerEvent): PointerSample {
  return {
    pointerId: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    pressure: typeof e.pressure === 'number' ? e.pressure : 0.5,
  };
}

/**
 * Stateful adapter converting individual DOM `PointerEvent` notifications into
 * unified `MotionEvent` stream snapshots.
 */
export class MotionEventStream {
  private readonly pointers = new Map<number, PointerSample>();
  private downTime = 0;
  private streamPointerType: string | null = null;
  private mouseButtonsTracked = false;

  get activePointerCount(): number {
    return this.pointers.size;
  }

  get activePointerIds(): IterableIterator<number> {
    return this.pointers.keys();
  }

  get activePointerType(): string | null {
    return this.pointers.size > 0 ? this.streamPointerType : null;
  }

  /**
   * Returns `true` when a tracked mouse pointer reports `buttons` without the
   * primary button bit (`1`), indicating `pointerup` was swallowed off-page
   * (e.g. over an iframe, OS dialog, or context menu).
   */
  hasReleasedMouseButton(e: PointerEvent): boolean {
    return (
      this.mouseButtonsTracked &&
      e.pointerType === 'mouse' &&
      this.pointers.has(e.pointerId) &&
      typeof e.buttons === 'number' &&
      (e.buttons & 1) === 0
    );
  }

  onPointerDown(e: PointerEvent): MotionEvent | null {
    // Ignore non-primary button presses (right/middle/barrel buttons) and macOS Ctrl+Click.
    if (
      (typeof e.button === 'number' && e.button !== 0) ||
      (e.pointerType === 'mouse' && e.ctrlKey)
    ) {
      return null;
    }

    const pointerType = e.pointerType || 'touch';

    // Recover automatically from orphaned "ghost" pointers (e.g. if an iOS notification
    // banner, modal, or iframe swallowed a prior `pointerup`/`pointercancel`, including
    // when a primary touch lifted cleanly and a secondary touch was orphaned):
    if (
      this.pointers.size > 0 &&
      ((pointerType === 'touch' && e.isPrimary === true) ||
        pointerType === 'mouse' ||
        this.pointers.has(e.pointerId) ||
        (this.streamPointerType !== null && this.streamPointerType !== pointerType))
    ) {
      this.clearStreamState();
    }

    const eventTime = readTimestamp(e);
    const wasEmpty = this.pointers.size === 0;
    if (wasEmpty) {
      this.downTime = eventTime;
      this.streamPointerType = pointerType;
      this.mouseButtonsTracked =
        pointerType === 'mouse' && typeof e.buttons === 'number' && (e.buttons & 1) === 1;
    }

    const {snapshot, actionIndex} = this.recordAndSnapshot(e);

    return new MotionEvent({
      action: wasEmpty ? MotionAction.DOWN : MotionAction.POINTER_DOWN,
      downTime: this.downTime,
      eventTime,
      actionIndex,
      pointerType,
      pointers: snapshot,
      originalEvent: e,
    });
  }

  /**
   * Converts a `pointermove` into a `MotionEvent`.
   * Pass `includeHistory = false` when no registered recognizer uses velocity to skip
   * `getCoalescedEvents()` allocations on 120Hz displays.
   */
  onPointerMove(e: PointerEvent, includeHistory = true): MotionEvent | null {
    if (!this.pointers.has(e.pointerId)) {
      return null;
    }

    const eventTime = readTimestamp(e);
    let history: readonly HistoricalSample[] = EMPTY_HISTORY;

    if (includeHistory && typeof e.getCoalescedEvents === 'function') {
      const coalesced = e.getCoalescedEvents();
      if (coalesced.length > 1) {
        const samples: HistoricalSample[] = [];
        // Per W3C PointerEvents, the last coalesced entry corresponds to `e` itself.
        for (let i = 0; i < coalesced.length - 1; i++) {
          const sub = coalesced[i];
          const subTime = readTimestamp(sub);
          // Filter WebKit bug where coalesced events report `timeStamp === 0` when `eventTime > 0`.
          if (eventTime > 0 && (subTime <= 0 || subTime > eventTime)) {
            continue;
          }
          samples.push({
            eventTime: subTime,
            x: sub.clientX,
            y: sub.clientY,
            pressure: typeof sub.pressure === 'number' ? sub.pressure : 0.5,
          });
        }
        if (samples.length > 0) {
          history = samples;
        }
      }
    }

    const {snapshot, actionIndex} = this.recordAndSnapshot(e);

    return new MotionEvent({
      action: MotionAction.MOVE,
      downTime: this.downTime,
      eventTime,
      actionIndex,
      pointerType: e.pointerType || 'touch',
      pointers: snapshot,
      history,
      originalEvent: e,
    });
  }

  onPointerUp(e: PointerEvent): MotionEvent | null {
    if (!this.pointers.has(e.pointerId)) {
      return null;
    }

    const eventTime = readTimestamp(e);
    const {snapshot, actionIndex} = this.recordAndSnapshot(e);

    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.streamPointerType = null;
      this.mouseButtonsTracked = false;
    }

    return new MotionEvent({
      action: this.pointers.size === 0 ? MotionAction.UP : MotionAction.POINTER_UP,
      downTime: this.downTime,
      eventTime,
      actionIndex,
      pointerType: e.pointerType || 'touch',
      pointers: snapshot,
      originalEvent: e,
    });
  }

  onPointerCancel(e: PointerEvent): MotionEvent | null {
    if (!this.pointers.has(e.pointerId)) {
      return null;
    }

    const eventTime = readTimestamp(e);
    const {snapshot, actionIndex} = this.recordAndSnapshot(e);
    this.clearStreamState();

    return new MotionEvent({
      action: MotionAction.CANCEL,
      downTime: this.downTime,
      eventTime,
      actionIndex,
      pointerType: e.pointerType || 'touch',
      pointers: snapshot,
      originalEvent: e,
    });
  }

  /** Updates an active pointer's coordinates without constructing a `MotionEvent`. */
  updatePointerSilent(e: PointerEvent): void {
    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, toPointerSample(e));
    }
  }

  /** Aborts all active pointers on `window` `blur`, hidden `visibilitychange`, or stuck mouse release. */
  cancelAll(triggerEvent: Event): MotionEvent | null {
    if (this.pointers.size === 0) {
      return null;
    }
    const snapshot = Array.from(this.pointers.values());
    const pointerType = this.streamPointerType ?? 'touch';
    const eventTime =
      typeof triggerEvent.timeStamp === 'number' &&
      Number.isFinite(triggerEvent.timeStamp) &&
      triggerEvent.timeStamp > 0
        ? triggerEvent.timeStamp
        : performance.now();

    this.clearStreamState();

    return new MotionEvent({
      action: MotionAction.CANCEL,
      downTime: this.downTime,
      eventTime,
      actionIndex: 0,
      pointerType,
      pointers: snapshot,
      originalEvent: triggerEvent,
    });
  }

  reset(): void {
    this.clearStreamState();
    this.downTime = 0;
  }

  private clearStreamState(): void {
    this.pointers.clear();
    this.streamPointerType = null;
    this.mouseButtonsTracked = false;
  }

  private recordAndSnapshot(e: PointerEvent): {
    snapshot: readonly PointerSample[];
    actionIndex: number;
  } {
    const sample = toPointerSample(e);
    this.pointers.set(e.pointerId, sample);
    if (this.pointers.size === 1) {
      return {snapshot: [sample], actionIndex: 0};
    }
    const snapshot = new Array<PointerSample>(this.pointers.size);
    let actionIndex = 0;
    let idx = 0;
    for (const p of this.pointers.values()) {
      if (p.pointerId === e.pointerId) {
        actionIndex = idx;
      }
      snapshot[idx++] = p;
    }
    return {snapshot, actionIndex};
  }
}
