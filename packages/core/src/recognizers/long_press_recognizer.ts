import {distance, type MotionEvent, type Point, ZERO_POINT} from '../motion_event.js';
import {
  type GestureEventData,
  GestureRecognizer,
  LONG_PRESS_DURATION_MS,
  TOUCH_SLOP,
} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_behavior.js';

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
    this.slop = Math.max(0, options.slop ?? TOUCH_SLOP);
    this.duration = options.duration ?? LONG_PRESS_DURATION_MS;
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return this.numPointers >= 2;
  }

  /** @internal */
  override canRearmOnPointerDown(event: MotionEvent): boolean {
    return this.numPointers >= 2 && event.activePointerCount >= this.numPointers;
  }

  /** @internal */
  override canSustainPendingBegan(activePointerCount: number): boolean {
    return activePointerCount === this.numPointers;
  }

  onMotionEvent(event: MotionEvent): void {
    this.lastEvent = event;

    switch (event.action) {
      case 'down': {
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
        break;
      }

      case 'pointer_down': {
        // An active long press already holds exactly `numPointers`; any extra finger ends it.
        if (this.active) {
          this.cancel();
          return;
        }
        const p = event.pointers[event.actionIndex];
        if (!p || event.activePointerCount > this.numPointers) {
          this.fail();
          return;
        }
        this.downPositions.set(p.pointerId, p);
        if (event.activePointerCount === this.numPointers) {
          this.armLongPress(event);
        }
        break;
      }

      case 'move': {
        if (this.active) {
          this.emitChange(() => {
            if (this.callbacks.onLongPressMove) {
              this.callbacks.onLongPressMove(this.buildEventData(event));
            }
          });
          return;
        }

        const moved = event.pointers[event.actionIndex];
        const start = moved ? this.downPositions.get(moved.pointerId) : undefined;
        if (moved && start && distance(moved, start) > this.slop) {
          this.fail();
        }
        break;
      }

      // Lifting any finger ends the press (an active press holds exactly `numPointers`).
      case 'pointer_up':
      case 'up': {
        if (this.active) {
          this.completeActive(() => {
            if (this.callbacks.onLongPressUp) {
              this.callbacks.onLongPressUp(this.buildEventData(event));
            }
          });
        } else {
          this.fail();
        }
        break;
      }

      case 'cancel': {
        this.cancel();
        break;
      }
    }
  }

  protected override onCancel(): void {
    this.callbacks.onLongPressCancel?.();
  }

  protected override onReset(): void {
    this.downPositions.clear();
    this.anchorFocus = ZERO_POINT;
    this.lastEvent = null;
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

  private buildEventData(event: MotionEvent): LongPressEventData {
    return {
      ...this.createEventData(event),
      deltaX: event.focus.x - this.anchorFocus.x,
      deltaY: event.focus.y - this.anchorFocus.y,
    };
  }
}
