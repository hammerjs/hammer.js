import type {MotionTracker} from '../motion_tracker';
import {GestureRecognizer, GestureEventData} from '../gesture_recognizer';

export interface PinchRotateEventData extends GestureEventData {
  scale: number;
  rotation: number;
}

export interface PinchRotateCallbacks {
  onPinchRotate: (data: PinchRotateEventData) => void;
}

export class PinchRotateRecognizer extends GestureRecognizer {
  private callbacks: PinchRotateCallbacks;

  constructor(callbacks: PinchRotateCallbacks) {
    super();
    this.callbacks = callbacks;
  }

  onStart(tracker: MotionTracker, _e: PointerEvent): void {
    this.active = tracker.pointers.size === 2;
  }

  onMove(tracker: MotionTracker, e: PointerEvent): void {
    if (tracker.pointers.size === 2) {
      this.active = true;
      this.callbacks.onPinchRotate({
        ...this.createEventData(tracker, e),
        scale: tracker.getScaleFactor(),
        rotation: tracker.getRotationDelta(),
      });
    } else {
      this.active = false;
    }
  }

  onEnd(tracker: MotionTracker, _e: PointerEvent): void {
    // If one finger lifts, gesture ends
    if (tracker.pointers.size < 2) {
      this.active = false;
    }
  }
}
