import type {Point, MotionTracker} from '../motion_tracker';
import {GestureEventData, GestureRecognizer} from '../gesture_recognizer';

export interface DragOptions {
  slop: number; // movement required to start drag (px)
}

export interface DragEventData extends GestureEventData {
  deltaX: number;
  deltaY: number;
}

export interface DragCallbacks {
  onDragStart?: () => void;
  onDrag?: (data: DragEventData) => void;
  onDragEnd?: () => void;
}

export class DragRecognizer extends GestureRecognizer {
  private callbacks: DragCallbacks;
  private options: DragOptions;

  private isDragging = false;
  private startPos: Point | null = null;

  static DEFAULTS: DragOptions = {
    slop: 5, // Minimum 8px to start drag
  };

  constructor(callbacks: DragCallbacks, options?: Partial<DragOptions>) {
    super();
    this.callbacks = callbacks;
    this.options = {...DragRecognizer.DEFAULTS, ...options};
  }

  onStart(tracker: MotionTracker, _e: PointerEvent): void {
    this.active = true;
    this.isDragging = false;
    this.startPos = {...tracker.centroid};
  }

  onMove(tracker: MotionTracker, e: PointerEvent): void {
    if (!this.active || !this.startPos) return;

    const deltaX = tracker.centroid.x - this.startPos.x;
    const deltaY = tracker.centroid.y - this.startPos.y;

    if (!this.isDragging) {
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (dist > this.options.slop) {
        this.isDragging = true;
        if (this.callbacks.onDragStart) this.callbacks.onDragStart();
      }
    }

    if (this.isDragging) {
      if (this.callbacks.onDrag) {
        this.callbacks.onDrag({
          ...this.createEventData(tracker, e),
          deltaX,
          deltaY,
        });
      }
    }
  }

  onEnd(_tracker: MotionTracker, _e: PointerEvent): void {
    if (this.isDragging) {
      if (this.callbacks.onDragEnd) this.callbacks.onDragEnd();
    }
    this.active = false;
    this.isDragging = false;
  }
}
