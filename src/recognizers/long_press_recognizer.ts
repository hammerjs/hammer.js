import {MotionAction, type MotionEvent, type Point} from '../motion_event';
import {type GestureEventData, GestureRecognizer, RecognizerState} from '../gesture_recognizer';
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
  onLongPress: (event: LongPressEventData) => void;
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

  override get usesVelocity(): boolean {
    return false;
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
        const p = event.pointers[0];
        if (p) {
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
        if (this.active) {
          if (event.activePointerCount !== this.numPointers) {
            this.cancel(false);
          }
          return;
        }
        if (event.activePointerCount > this.numPointers) {
          this.fail();
          return;
        }
        const p = event.pointers[event.actionIndex];
        if (p) {
          this.downPositions.set(p.pointerId, {x: p.x, y: p.y});
        }
        if (event.activePointerCount === this.numPointers) {
          this.armLongPress(event);
        }
        break;
      }

      case MotionAction.MOVE: {
        if (this.active) {
          if (this.callbacks.onLongPressMove) {
            this.emitChange(() => {
              this.callbacks.onLongPressMove?.(this.buildEventData(event));
            });
          }
          return;
        }

        const moved = event.pointers[event.actionIndex];
        if (!moved) break;
        const start = this.downPositions.get(moved.pointerId);
        if (start && Math.hypot(moved.x - start.x, moved.y - start.y) > this.slop) {
          this.fail();
        }
        break;
      }

      case MotionAction.POINTER_UP: {
        if (this.active) {
          if (event.activePointerCount < this.numPointers) {
            this.completeActive(() => {
              this.callbacks.onLongPressUp?.(this.buildEventData(event));
            });
          }
        } else {
          this.fail();
        }
        break;
      }

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
      const triggerEvent = this.lastEvent;
      if (this.state !== RecognizerState.POSSIBLE || !triggerEvent) {
        return;
      }
      this.tryBegin(() => {
        this.anchorFocus = triggerEvent.focus;
        this.callbacks.onLongPress(this.buildEventData(triggerEvent));
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
