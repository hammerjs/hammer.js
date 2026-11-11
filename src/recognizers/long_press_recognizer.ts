import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer} from '../gesture_recognizer';
import type {TouchActionValue} from '../touch_behavior';

export interface LongPressOptions {
  /** Number of simultaneous pointers required. Default: `1`. */
  numPointers: number;
  /** Maximum radial movement in `px` allowed before `duration` elapses. */
  slop: number;
  /** Hold duration in `ms` required to trigger long press. */
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

const LONG_PRESS_TIMER = 'longPress';

export class LongPressRecognizer extends GestureRecognizer {
  readonly type = 'longPress';

  private readonly callbacks: LongPressCallbacks;
  private readonly userOptions: Partial<LongPressOptions>;

  private readonly downPositions = new Map<number, Point>();
  private anchorFocus: Point = {x: 0, y: 0};
  private lastEvent: MotionEvent | null = null;

  constructor(callbacks: LongPressCallbacks, options: Partial<LongPressOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.userOptions = options;
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

  private get numPointers(): number {
    return this.userOptions.numPointers ?? 1;
  }

  private get slop(): number {
    return this.userOptions.slop ?? this.config.touchSlop;
  }

  private get duration(): number {
    return this.userOptions.duration ?? this.config.longPressTimeout;
  }

  onMotionEvent(event: MotionEvent): void {
    this.lastEvent = event;

    switch (event.action) {
      case MotionAction.DOWN: {
        this.downPositions.clear();
        for (let i = 0; i < event.pointers.length; i++) {
          const p = event.pointers[i];
          this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
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

      case MotionAction.POINTER_DOWN: {
        // An active long press already holds exactly `numPointers`; any extra finger ends it.
        if (this.active) {
          this.cancel();
          return;
        }
        if (event.activePointerCount > this.numPointers) {
          this.fail();
          return;
        }
        const p = event.pointers[event.actionIndex];
        this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
        if (event.activePointerCount === this.numPointers) {
          this.armLongPress(event);
        }
        break;
      }

      case MotionAction.MOVE: {
        if (this.active) {
          this.emitChange(() => {
            this.callbacks.onLongPressMove?.(this.buildEventData(event));
          });
          return;
        }

        const moved = event.pointers[event.actionIndex];
        const start = this.downPositions.get(moved.pointerId);
        if (start && Math.hypot(moved.x - start.x, moved.y - start.y) > this.slop) {
          this.fail();
        }
        break;
      }

      // Lifting any finger ends the press (an active press holds exactly `numPointers`).
      case MotionAction.POINTER_UP:
      case MotionAction.UP: {
        if (this.active) {
          this.completeActive(() => {
            this.callbacks.onLongPressUp?.(this.buildEventData(event));
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
    this.callbacks.onLongPressCancel?.();
  }

  protected override onReset(): void {
    this.downPositions.clear();
    this.anchorFocus = {x: 0, y: 0};
    this.lastEvent = null;
  }

  private armLongPress(armEvent: MotionEvent): void {
    this.anchorFocus = armEvent.focus;
    this.setTimer(LONG_PRESS_TIMER, this.duration, () => {
      const triggerEvent = this.lastEvent ?? armEvent;
      this.tryBegin(() => {
        this.anchorFocus = triggerEvent.focus;
        this.callbacks.onLongPress?.(this.buildEventData(triggerEvent));
      });
    });
  }

  private buildEventData(event: MotionEvent): LongPressEventData {
    return {
      ...this.createEventData(event),
      deltaX: event.focusX - this.anchorFocus.x,
      deltaY: event.focusY - this.anchorFocus.y,
    };
  }
}
