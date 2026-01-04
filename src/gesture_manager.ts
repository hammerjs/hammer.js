import {MotionTracker} from './motion_tracker';
import {GestureRecognizer} from './gesture_recognizer';
import {setTouchBehavior, TouchBehavior} from './touch_behavior';

export interface GestureManagerOptions {
  // which pointer types to track.
  // see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType
  supportedPointerTypes: ('mouse' | 'touch' | 'pen' | string)[];
  touchBehavior: TouchBehavior | null;
}

export class GestureManager {
  private element: HTMLElement;
  private tracker: MotionTracker;
  private recognizers: GestureRecognizer[];
  private options: GestureManagerOptions;
  private unbindEvents: () => void;
  private unsetTouchBehavior: (() => void) | null = null;

  static DEFAULTS: GestureManagerOptions = {
    supportedPointerTypes: ['touch', 'pen'],
    touchBehavior: {
      preventScrollX: true,
      preventScrollY: true,
      preventZoom: true,
      preventSelect: true,
      preventContextMenu: true,
    },
  };

  constructor(element: HTMLElement, options: Partial<GestureManagerOptions> = {}) {
    this.tracker = new MotionTracker();
    this.recognizers = [];

    this.element = element;
    this.options = {...GestureManager.DEFAULTS, ...options};

    this.unbindEvents = this.bindEvents();

    if (this.options.touchBehavior) {
      this.unsetTouchBehavior = setTouchBehavior(this.element, this.options.touchBehavior);
    }
  }

  register(recognizer: GestureRecognizer): void {
    this.recognizers.push(recognizer);
  }

  unregister(recognizer: GestureRecognizer): void {
    this.recognizers = this.recognizers.filter(r => r !== recognizer);
  }

  destroy(): void {
    this.unbindEvents();
    this.unsetTouchBehavior?.();
    this.recognizers = [];
  }

  private isValidPointer(e: PointerEvent): boolean {
    return this.options.supportedPointerTypes.includes(e.pointerType);
  }

  private bindEvents(): () => void {
    const onStart = this.onStart.bind(this);
    const onMove = this.onMove.bind(this);
    const onEnd = this.onEnd.bind(this);

    this.element.addEventListener('pointerdown', onStart, {passive: false});
    this.element.addEventListener('pointermove', onMove, {passive: false});
    this.element.addEventListener('pointerup', onEnd, {passive: false});
    this.element.addEventListener('pointercancel', onEnd, {passive: false});

    return () => {
      this.element.removeEventListener('pointerdown', onStart);
      this.element.removeEventListener('pointermove', onMove);
      this.element.removeEventListener('pointerup', onEnd);
      this.element.removeEventListener('pointercancel', onEnd);
    };
  }

  private onStart(e: PointerEvent): void {
    if (!this.isValidPointer(e)) {
      return;
    }

    this.element.setPointerCapture?.(e.pointerId);
    this.tracker.addPointer(e);

    for (const r of this.recognizers) {
      r.onStart(this.tracker, e);
    }
  }

  private onMove(e: PointerEvent): void {
    if (!this.isValidPointer(e)) {
      return;
    }

    // Handle Coalesced Events for higher fidelity physics like velocity
    const events = e.getCoalescedEvents?.().length > 0 ? e.getCoalescedEvents() : [e];
    for (const subEvent of events) {
      this.tracker.update(subEvent);
    }

    for (const r of this.recognizers) {
      r.onMove(this.tracker, e);
    }
  }

  private onEnd(e: PointerEvent): void {
    if (!this.isValidPointer(e)) {
      return;
    }

    for (const r of this.recognizers) {
      r.onEnd(this.tracker, e);
    }

    this.tracker.removePointer(e);
    this.element.releasePointerCapture?.(e.pointerId);
  }
}
