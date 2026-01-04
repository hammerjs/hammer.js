import type {MotionTracker, Point} from './motion_tracker';

export interface GestureEventData {
  center: Point;
  originalEvent: PointerEvent;
}

export abstract class GestureRecognizer {
  active = false;

  abstract onStart(tracker: MotionTracker, e: PointerEvent): void;
  abstract onMove(tracker: MotionTracker, e: PointerEvent): void;
  abstract onEnd(tracker: MotionTracker, e: PointerEvent): void;

  /**
   * Helper to create the standard event payload.
   */
  protected createEventData(tracker: MotionTracker, e: PointerEvent): GestureEventData {
    return {
      center: {...tracker.centroid}, // copy to avoid reference issues
      originalEvent: e,
    };
  }
}
