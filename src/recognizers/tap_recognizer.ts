import type {Point, MotionTracker} from '../motion_tracker';
import {GestureEventData, GestureRecognizer} from '../gesture_recognizer';

export interface TapOptions {
  slop: number; // max movement allowed (px)
  maxTime: number; // max time allowed (ms)
}

export interface TapCallbacks {
  onTap: (event: GestureEventData) => void;
}

export class TapRecognizer extends GestureRecognizer {
  private callbacks: TapCallbacks;
  private options: TapOptions;

  private startPos: Point | null = null;
  private startTime = 0;
  private isFailed = false;

  static DEFAULTS: TapOptions = {
    slop: 10,
    maxTime: 250,
  };

  constructor(callbacks: TapCallbacks, options?: Partial<TapOptions>) {
    super();
    this.callbacks = callbacks;
    this.options = {...TapRecognizer.DEFAULTS, ...options};
  }

  onStart(tracker: MotionTracker, _e: PointerEvent): void {
    if (tracker.pointers.size > 1) {
      this.isFailed = true;
      return;
    }
    this.active = true;
    this.isFailed = false;
    this.startPos = {...tracker.centroid};
    this.startTime = Date.now();
  }

  onMove(tracker: MotionTracker, _e: PointerEvent): void {
    if (this.isFailed || !this.active || !this.startPos) return;

    const dx = tracker.centroid.x - this.startPos.x;
    const dy = tracker.centroid.y - this.startPos.y;

    // Use Euclidean distance for robust radial slop detection
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.options.slop) {
      this.isFailed = true;
    }
  }

  onEnd(tracker: MotionTracker, e: PointerEvent): void {
    if (this.isFailed || !this.active) return;

    const time = Date.now() - this.startTime;
    if (time < this.options.maxTime) {
      this.callbacks.onTap(this.createEventData(tracker, e));
    }
    this.active = false;
  }
}
