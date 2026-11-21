import {
  EMPTY_HISTORY,
  type HistoricalSample,
  MotionEvent,
  type PointerSample,
} from './motion_event.js';

/**
 * Stateful adapter converting individual DOM `PointerEvent` notifications into
 * unified `MotionEvent` stream snapshots.
 */
export class MotionEventStream {
  private readonly pointers = new Map<number, PointerSample>();
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

  hasPointer(pointerId: number): boolean {
    return this.pointers.has(pointerId);
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
      (e.buttons & 1) === 0
    );
  }

  onPointerDown(e: PointerEvent): MotionEvent | null {
    // Ignore non-primary button presses (right/middle/barrel buttons) and macOS Ctrl+Click.
    if (e.button !== 0 || (e.pointerType === 'mouse' && e.ctrlKey)) {
      return null;
    }

    const pointerType = e.pointerType || 'touch';

    // Recover automatically from orphaned "ghost" pointers (e.g. if an iOS notification
    // banner, modal, or iframe swallowed a prior `pointerup`/`pointercancel`, including
    // when a primary touch lifted cleanly and a secondary touch was orphaned):
    if (
      this.pointers.size > 0 &&
      (e.isPrimary ||
        pointerType === 'mouse' ||
        pointerType === 'pen' ||
        this.pointers.has(e.pointerId) ||
        (this.streamPointerType !== null && this.streamPointerType !== pointerType))
    ) {
      this.reset();
    }

    const wasEmpty = this.pointers.size === 0;
    if (wasEmpty) {
      this.streamPointerType = pointerType;
      this.mouseButtonsTracked = pointerType === 'mouse' && (e.buttons & 1) === 1;
    }

    const {snapshot, actionIndex} = this.recordAndSnapshot(e);

    return new MotionEvent({
      action: wasEmpty ? 'down' : 'pointer_down',
      eventTime: e.timeStamp,
      actionIndex,
      pointerType,
      pointers: snapshot,
      originalEvent: e,
    });
  }

  /** Converts a `pointermove` into a `MotionEvent`, optionally including coalesced intermediate samples. */
  onPointerMove(e: PointerEvent, includeHistory = true): MotionEvent | null {
    if (!this.pointers.has(e.pointerId)) {
      return null;
    }

    const eventTime = e.timeStamp;
    let history: readonly HistoricalSample[] = EMPTY_HISTORY;

    if (includeHistory && typeof e.getCoalescedEvents === 'function') {
      const coalesced = e.getCoalescedEvents();
      if (coalesced.length > 1) {
        const samples: HistoricalSample[] = [];
        // Per W3C PointerEvents, the last coalesced entry corresponds to `e` itself.
        for (let i = 0; i < coalesced.length - 1; i++) {
          const sub = coalesced[i];
          const subTime = sub.timeStamp;
          // Filter WebKit bug where coalesced events report `timeStamp === 0` when `eventTime > 0`.
          if (eventTime > 0 && (subTime <= 0 || subTime > eventTime)) {
            continue;
          }
          samples.push({
            eventTime: subTime,
            x: sub.clientX,
            y: sub.clientY,
          });
        }
        if (samples.length > 0) {
          history = samples;
        }
      }
    }

    const {snapshot, actionIndex} = this.recordAndSnapshot(e);

    return new MotionEvent({
      action: 'move',
      eventTime,
      actionIndex,
      pointerType: this.resolvePointerType(e),
      pointers: snapshot,
      history,
      originalEvent: e,
    });
  }

  onPointerUp(e: PointerEvent): MotionEvent | null {
    if (!this.pointers.has(e.pointerId)) {
      return null;
    }

    const pointerType = this.resolvePointerType(e);
    const {snapshot, actionIndex} = this.recordAndSnapshot(e);

    this.pointers.delete(e.pointerId);
    const isFinalUp = this.pointers.size === 0;
    if (isFinalUp) {
      this.reset();
    }

    return new MotionEvent({
      action: isFinalUp ? 'up' : 'pointer_up',
      eventTime: e.timeStamp,
      actionIndex,
      pointerType,
      pointers: snapshot,
      originalEvent: e,
    });
  }

  onPointerCancel(e: PointerEvent): MotionEvent | null {
    if (!this.pointers.has(e.pointerId)) {
      return null;
    }

    const pointerType = this.resolvePointerType(e);
    const {snapshot, actionIndex} = this.recordAndSnapshot(e);
    this.reset();

    return new MotionEvent({
      action: 'cancel',
      eventTime: e.timeStamp,
      actionIndex,
      pointerType,
      pointers: snapshot,
      originalEvent: e,
    });
  }

  /** Aborts all active pointers on `window` `blur`, hidden `visibilitychange`, or stuck mouse release. */
  cancelAll(triggerEvent: Event): MotionEvent | null {
    if (this.pointers.size === 0) {
      return null;
    }
    const snapshot = Array.from(this.pointers.values());
    const pointerType = this.streamPointerType ?? 'touch';
    const eventTime = triggerEvent.timeStamp > 0 ? triggerEvent.timeStamp : performance.now();

    this.reset();

    return new MotionEvent({
      action: 'cancel',
      eventTime,
      actionIndex: 0,
      pointerType,
      pointers: snapshot,
      originalEvent: triggerEvent,
    });
  }

  reset(): void {
    this.pointers.clear();
    this.streamPointerType = null;
    this.mouseButtonsTracked = false;
  }

  private resolvePointerType(e: PointerEvent): string {
    return e.pointerType || this.streamPointerType || 'touch';
  }

  private recordAndSnapshot(e: PointerEvent): {
    snapshot: readonly PointerSample[];
    actionIndex: number;
  } {
    const sample: PointerSample = {pointerId: e.pointerId, x: e.clientX, y: e.clientY};
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
