import {createDescriptor, type GestureDescriptor} from '../descriptors.js';
import {centroid, distance, type MotionEvent, type Point, ZERO_POINT} from '../motion_event.js';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_action.js';

const DEFAULT_SLOP = 8;
const DEFAULT_DURATION_MS = 500;

export interface LongPressOptions {
  /** Number of simultaneous pointers required. Default: `1`. */
  numPointers: number;
  /** Maximum radial movement in `px` allowed before `duration` elapses. Default: `8`. */
  slop: number;
  /** Hold duration in `ms` required to trigger long press. Default: `500`. */
  duration: number;
}

export interface LongPressEventData extends GestureEventData {
  /** Cumulative horizontal movement since long-press start (`0` on initial trigger). */
  readonly deltaX: number;
  /** Cumulative vertical movement since long-press start (`0` on initial trigger). */
  readonly deltaY: number;
}

export interface LongPressCallbacks {
  onLongPress?: (event: LongPressEventData) => void;
  onLongPressMove?: (event: LongPressEventData) => void;
  onLongPressUp?: (event: LongPressEventData) => void;
  onLongPressCancel?: () => void;
}

export class LongPressRecognizer extends GestureRecognizer {
  private readonly callbacks: LongPressCallbacks;
  private readonly numPointers: number;
  private readonly slop: number;
  private readonly duration: number;

  private readonly downPositions = new Map<number, Point>();
  private anchorFocus: Point = ZERO_POINT;
  private lastEvent: MotionEvent | null = null;

  constructor(callbacks: LongPressCallbacks, options: Partial<LongPressOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.numPointers = options.numPointers ?? 1;
    this.slop = Math.max(0, options.slop ?? DEFAULT_SLOP);
    this.duration = options.duration ?? DEFAULT_DURATION_MS;
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return this.numPointers >= 2;
  }

  override onMotionEvent(event: MotionEvent): void {
    this.lastEvent = event;
    super.onMotionEvent(event);
  }

  protected override onDown(event: MotionEvent): void {
    this.downPositions.clear();
    for (const p of event.pointers) {
      this.downPositions.set(p.pointerId, p);
    }
    if (event.activePointerCount > this.numPointers) {
      this.fail();
      return;
    }
    if (event.activePointerCount === this.numPointers) {
      this.armLongPress(event);
    }
  }

  protected override onPointerDown(event: MotionEvent): void {
    // An active long press already holds exactly `numPointers`; any extra finger ends it.
    if (this.active) {
      this.cancel();
      return;
    }
    if (event.activePointerCount > this.numPointers) {
      this.fail();
      return;
    }
    // Record any pointers not yet tracked on `down`.
    for (const ptr of event.pointers) {
      if (!this.downPositions.has(ptr.pointerId)) {
        this.downPositions.set(ptr.pointerId, ptr);
      }
    }
    if (event.activePointerCount === this.numPointers) {
      this.armLongPress(event);
    }
  }

  protected override onMove(event: MotionEvent): void {
    if (this.emitChange()) {
      if (this.callbacks.onLongPressMove) {
        this.callbacks.onLongPressMove(this.buildEventData(event));
      }
      return;
    }

    const moved = event.pointers[event.actionIndex];
    const start = moved ? this.downPositions.get(moved.pointerId) : undefined;
    if (moved && start && distance(moved, start) > this.slop) {
      this.fail();
    }
  }

  // Lifting any finger ends the press (an active press holds exactly `numPointers`).
  protected override onPointerUp(event: MotionEvent): void {
    this.finishPress(event, centroid(event.pointers));
  }

  protected override onUp(event: MotionEvent): void {
    this.finishPress(event);
  }

  protected override onCancel(): void {
    this.callbacks.onLongPressCancel?.();
  }

  protected override onReset(): void {
    this.downPositions.clear();
    this.anchorFocus = ZERO_POINT;
    this.lastEvent = null;
  }

  private finishPress(event: MotionEvent, centerOverride?: Point): void {
    if (this.completeActive()) {
      if (this.callbacks.onLongPressUp) {
        this.callbacks.onLongPressUp(this.buildEventData(event, centerOverride));
      }
    } else {
      this.fail();
    }
  }

  private armLongPress(armEvent: MotionEvent): void {
    this.anchorFocus = armEvent.focus;
    this.setTimer(this.duration, () => {
      this.tryBegin(() => {
        const triggerEvent = this.lastEvent ?? armEvent;
        this.anchorFocus = triggerEvent.focus;
        if (this.callbacks.onLongPress) {
          this.callbacks.onLongPress(this.buildEventData(triggerEvent));
        }
      });
    });
  }

  private buildEventData(event: MotionEvent, centerOverride?: Point): LongPressEventData {
    const center = centerOverride ?? event.focus;
    return {
      center,
      motionEvent: event,
      originalEvent: event.originalEvent,
      deltaX: center.x - this.anchorFocus.x,
      deltaY: center.y - this.anchorFocus.y,
    };
  }
}

export type LongPressGestureOptions = Partial<LongPressOptions> & LongPressCallbacks;

/** Creates a tree-shakable `LongPressRecognizer` descriptor. */
export function longPress(options?: LongPressGestureOptions): GestureDescriptor {
  return createDescriptor(
    'longPress',
    options as Record<string, unknown> | undefined,
    (cbs, cfg) =>
      new LongPressRecognizer(cbs as LongPressCallbacks, cfg as Partial<LongPressOptions>)
  );
}
