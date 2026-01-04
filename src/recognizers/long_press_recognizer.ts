import type {Point, MotionTracker} from '../motion_tracker';
import {GestureEventData, GestureRecognizer} from '../gesture_recognizer';

export interface LongPressOptions {
  slop: number; // max movement allowed (px)
  duration: number; // min time required (ms)
}

export interface LongPressCallbacks {
  onLongPress: (event: GestureEventData) => void;
}

export class LongPressRecognizer extends GestureRecognizer {
  private callbacks: LongPressCallbacks;
  private options: LongPressOptions;

  private startPos: Point | null = null;
  private timer: number | null = null;
  private triggered = false;
  private initialEventData: GestureEventData | null = null;

  static DEFAULTS: LongPressOptions = {
    slop: 10,
    duration: 500,
  };

  constructor(callbacks: LongPressCallbacks, options?: Partial<LongPressOptions>) {
    super();
    this.callbacks = callbacks;
    this.options = {...LongPressRecognizer.DEFAULTS, ...options};
  }

  onStart(tracker: MotionTracker, e: PointerEvent): void {
    if (tracker.pointers.size > 1) return;

    this.active = true;
    this.startPos = {...tracker.centroid};
    this.triggered = false;
    this.initialEventData = this.createEventData(tracker, e);

    this.timer = window.setTimeout(() => {
      if (this.active) {
        this.triggered = true;
        if (this.initialEventData) {
          this.callbacks.onLongPress(this.initialEventData);
        }
      }
    }, this.options.duration);
  }

  onMove(tracker: MotionTracker, _e: PointerEvent): void {
    if (!this.active || this.triggered || !this.startPos) return;

    const dx = tracker.centroid.x - this.startPos.x;
    const dy = tracker.centroid.y - this.startPos.y;

    // Use Euclidean distance
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.options.slop) {
      if (this.timer !== null) {
        clearTimeout(this.timer);
      }
      this.active = false;
    }
  }

  onEnd(_tracker: MotionTracker, _e: PointerEvent): void {
    this.active = false;

    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
  }
}
