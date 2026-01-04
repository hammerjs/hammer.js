import type {Point, MotionTracker} from '../motion_tracker';
import {GestureEventData, GestureRecognizer} from '../gesture_recognizer';

export interface SwipeOptions {
  minVelocity: number; // px/ms
  maxVelocity: number; // px/ms
  minDist: number; // px
}

export interface SwipeEventData extends GestureEventData {
  velocityX: number;
  velocityY: number;
  direction: 'horizontal' | 'vertical';
}

export interface SwipeCallbacks {
  onSwipe: (data: SwipeEventData) => void;
}

export class SwipeRecognizer extends GestureRecognizer {
  private callbacks: SwipeCallbacks;
  private options: SwipeOptions;
  private startPos: Point | null = null;

  static DEFAULTS: SwipeOptions = {
    minVelocity: 0.3, // ~300px/s
    maxVelocity: 8.0, // ~8000px/s (Native Android Fling Cap)
    minDist: 30,
  };

  constructor(callbacks: SwipeCallbacks, options?: Partial<SwipeOptions>) {
    super();
    this.callbacks = callbacks;
    this.options = {...SwipeRecognizer.DEFAULTS, ...options};
  }

  onStart(tracker: MotionTracker, _e: PointerEvent): void {
    this.active = true;
    this.startPos = {...tracker.centroid};
  }

  onMove(_tracker: MotionTracker, _e: PointerEvent): void {}

  onEnd(tracker: MotionTracker, e: PointerEvent): void {
    if (!this.active || !this.startPos) {
      this.active = false;
      return;
    }

    const dist = Math.sqrt(
      Math.pow(tracker.centroid.x - this.startPos.x, 2) +
        Math.pow(tracker.centroid.y - this.startPos.y, 2)
    );

    const totalVelocity = Math.sqrt(tracker.velocityX ** 2 + tracker.velocityY ** 2);

    if (
      totalVelocity > this.options.minVelocity &&
      totalVelocity < this.options.maxVelocity &&
      dist > this.options.minDist
    ) {
      this.callbacks.onSwipe({
        ...this.createEventData(tracker, e),
        velocityX: tracker.velocityX,
        velocityY: tracker.velocityY,
        direction:
          Math.abs(tracker.velocityX) > Math.abs(tracker.velocityY) ? 'horizontal' : 'vertical',
      });
    }
    this.active = false;
  }
}
