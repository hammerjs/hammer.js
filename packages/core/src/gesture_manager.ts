import {armClickSuppression, isEditableOrFormControl, toggleListener} from './dom_utils.js';
import {GestureArena} from './gesture_arena.js';
import type {GestureRecognizer} from './gesture_recognizer.js';
import {MotionEventStream} from './motion_event_stream.js';
import {PointerCapture} from './pointer_capture.js';
import {
  type GestureTargetElement,
  SurfaceGuard,
  type TouchActionSetting,
  type TouchActionValue,
} from './touch_behavior.js';

export type PointerType = 'touch' | 'pen' | 'mouse';

const DEFAULT_POINTER_TYPES: readonly PointerType[] = ['touch', 'pen', 'mouse'];

export interface GestureManagerOptions {
  /**
   * Pointer device types to observe (`'touch'`, `'pen'`, `'mouse'`).
   * Default: `['touch', 'pen', 'mouse']`.
   */
  supportedPointerTypes?: readonly PointerType[];
  /**
   * CSS `touch-action` & mobile coexistence policy:
   * - `'compute'` (default): automatically derives the least-restrictive W3C
   *   `touch-action` from registered recognizers (`Tap`/`LongPress`/`QuickScale` -> `'manipulation'`,
   *   horizontal `Pan` -> `'pan-y pinch-zoom'`, `Scale`/`Rotate` -> `'pan-x pan-y'`,
   *   2D `Pan` -> `'none'`) so mobile pages never suffer accidental scroll-locks.
   * - Any explicit `TouchActionValue` (e.g. `'pan-y'`, `'manipulation'`, `'none'`).
   * - `false`: leaves element inline styles and extra touch/selection guards untouched.
   */
  touchAction?: TouchActionSetting;
  /** Recognizers to register in the gesture arena. */
  recognizers?: readonly GestureRecognizer[];
  /**
   * Controls whether pointer presses originating on interactive form controls
   * (`<input>`, `<textarea>`, `<select>`, `<option>`, `[contenteditable]`) are ignored
   * so native typing, text selection, and range-slider drags remain unobstructed.
   * - `true` (default): ignores native form/editable controls inside `element`.
   * - `false`: observes all targets including form controls.
   * - `(target: EventTarget) => boolean`: custom predicate returning `true` to ignore.
   */
  ignoreTarget?: boolean | ((target: EventTarget) => boolean);
}

/**
 * Attaches DOM `PointerEvent` listeners to an `HTMLElement` or `SVGElement`, translates them
 * into unified `MotionEvent` snapshots via `MotionEventStream`, and arbitrates registered
 * `GestureRecognizer`s through `GestureArena`.
 */
export class GestureManager<T extends GestureTargetElement = GestureTargetElement> {
  readonly element: T;
  private readonly stream = new MotionEventStream();
  private readonly arena: GestureArena;
  private readonly pointerCapture: PointerCapture;
  private readonly surfaceGuard: SurfaceGuard;
  private readonly supportedPointerTypes: readonly PointerType[];
  private readonly ignoreTarget: boolean | ((target: EventTarget) => boolean);

  private disarmClickSuppression: (() => void) | null = null;
  private trackingActive = false;
  private trackingWin: Window | null = null;
  private lastHandledDown: Event | null = null;
  private destroyed = false;

  constructor(element: T, options: GestureManagerOptions = {}) {
    this.element = element;
    this.pointerCapture = new PointerCapture(element);
    this.supportedPointerTypes = options.supportedPointerTypes ?? DEFAULT_POINTER_TYPES;
    this.ignoreTarget = options.ignoreTarget ?? true;

    this.arena = new GestureArena({
      onActiveGestureStart: () => this.pointerCapture.capture(this.stream.activePointerIds),
    });

    this.surfaceGuard = new SurfaceGuard({
      element,
      touchAction: options.touchAction ?? 'compute',
      supportedPointerTypes: this.supportedPointerTypes,
      shouldIgnoreEvent: e => this.shouldIgnoreTarget(e),
      shouldPreventTouchMove: () => this.arena.shouldPreventTouchMove,
      getActivePointerType: () => this.stream.activePointerType,
      onAbortActiveStream: e => this.abortActiveStream(e),
    });

    if (options.recognizers) {
      for (const recognizer of options.recognizers) {
        this.arena.add(recognizer);
      }
    }
    toggleListener(this.element, 'pointerdown', this, true);
    toggleListener(this.element, 'lostpointercapture', this, true);
    this.syncSurface();
  }

  /** Returns the W3C CSS `touch-action` computed from the registered recognizers. */
  computeTouchAction(): TouchActionValue {
    return this.arena.computeTouchAction();
  }

  register(...recognizers: GestureRecognizer[]): this {
    if (!this.destroyed && recognizers.length > 0) {
      for (const recognizer of recognizers) {
        this.arena.add(recognizer);
      }
      this.syncSurface();
    }
    return this;
  }

  unregister(...recognizers: GestureRecognizer[]): this {
    if (!this.destroyed && recognizers.length > 0) {
      for (const recognizer of recognizers) {
        this.arena.remove(recognizer);
      }
      this.syncSurface();
    }
    return this;
  }

  /**
   * Cancels any active pointer stream, notifies in-flight recognizers (e.g. `onPanCancel`),
   * clears pending click suppression, releases captured pointers, and stops tracking until
   * the next `pointerdown`.
   */
  cancel(): void {
    if (this.destroyed) {
      return;
    }
    this.clearClickSuppression();
    this.abortActiveStream(new Event('cancel'));
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.clearClickSuppression();
    this.stopTracking();
    toggleListener(this.element, 'pointerdown', this, false);
    toggleListener(this.element, 'lostpointercapture', this, false);
    this.surfaceGuard.destroy();
    this.stream.reset();
    this.arena.destroy();
  }

  /** @internal */
  handleEvent(ev: Event): void {
    switch (ev.type) {
      case 'pointermove':
        this.onPointerMove(ev as PointerEvent);
        break;
      case 'pointerdown':
        if (ev.currentTarget === this.element) {
          this.onElementPointerDown(ev as PointerEvent);
        } else {
          this.onDocumentPointerDown(ev as PointerEvent);
        }
        break;
      case 'pointerup':
        this.onPointerUp(ev as PointerEvent);
        break;
      case 'pointercancel':
        if (this.isValidPointer(ev as PointerEvent)) {
          this.cancelPointer(ev as PointerEvent);
        }
        break;
      case 'lostpointercapture':
        this.onLostPointerCapture(ev as PointerEvent);
        break;
      case 'blur':
        this.abortActiveStream(ev);
        break;
      case 'visibilitychange':
        if (this.element.ownerDocument.visibilityState === 'hidden') {
          this.abortActiveStream(ev);
        }
        break;
    }
  }

  private onElementPointerDown(e: PointerEvent): void {
    if (this.shouldIgnoreTarget(e)) {
      return;
    }
    this.lastHandledDown = e;
    if (this.isValidPointer(e)) {
      this.processPointerDown(e);
    }
  }

  private onDocumentPointerDown(e: PointerEvent): void {
    if (e === this.lastHandledDown || !this.isValidPointer(e)) {
      return;
    }
    const pointerType = e.pointerType || 'touch';
    // Allow secondary touch fingers landing outside `this.element` to join an active multi-touch stream:
    if (
      pointerType === 'touch' &&
      !e.isPrimary &&
      this.arena.acceptsMultiTouch &&
      this.stream.activePointerCount > 0 &&
      this.stream.activePointerType === 'touch' &&
      !this.shouldIgnoreTarget(e, null)
    ) {
      this.processPointerDown(e);
      return;
    }
    // If a brand-new primary press starts outside `this.element`, any active stream on
    // `this.element` was orphaned by a swallowed `pointerup`; abort it cleanly.
    if (
      e.button === 0 &&
      (e.isPrimary === true || pointerType === 'mouse' || pointerType === 'pen')
    ) {
      this.abortActiveStream(e);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isValidPointer(e)) {
      return;
    }
    if (this.stream.hasReleasedMouseButton(e)) {
      this.abortActiveStream(e);
      return;
    }
    const motionEvent = this.stream.onPointerMove(e, this.arena.needsCoalescedHistory);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isValidPointer(e)) {
      return;
    }
    const motionEvent = this.stream.onPointerUp(e);
    if (!motionEvent) {
      return;
    }
    this.arena.dispatch(motionEvent);
    this.pointerCapture.release(e.pointerId);
    if (this.stream.activePointerCount === 0) {
      if (this.arena.didSuppressingGestureWin) {
        this.clearClickSuppression();
        this.disarmClickSuppression = armClickSuppression(this.element);
      }
      this.setActiveTracking(false);
    }
  }

  private onLostPointerCapture(e: PointerEvent): void {
    // Ignore `lostpointercapture` from child descendants or pointers we never captured / already released.
    if (e.target !== this.element) {
      return;
    }
    if (this.pointerCapture.consumeLost(e.pointerId)) {
      this.cancelPointer(e);
    }
  }

  private shouldIgnoreTarget(e: Event, boundary: Element | null = this.element): boolean {
    if (this.ignoreTarget === false) {
      return false;
    }
    const path = e.composedPath();
    const target = path[0] ?? e.target;
    if (!target) {
      return false;
    }
    if (typeof this.ignoreTarget === 'function') {
      return this.ignoreTarget(target);
    }
    return isEditableOrFormControl(target, boundary, path);
  }

  private isValidPointer(e: PointerEvent): boolean {
    return (this.supportedPointerTypes as readonly string[]).includes(e.pointerType || 'touch');
  }

  private syncSurface(): void {
    const recognizers = this.arena.getRecognizers();
    this.surfaceGuard.sync(
      recognizers.map(r => r.getTouchAction()),
      recognizers.some(r => r.suppressesClick)
    );
  }

  /** Attaches or detaches document-level listeners for the lifetime of a single pointer stream. */
  private setActiveTracking(active: boolean): void {
    if (!active) {
      this.lastHandledDown = null;
    }
    if (this.trackingActive === active) {
      return;
    }

    const doc = this.element.ownerDocument;
    const win = active ? doc.defaultView : this.trackingWin;

    this.trackingActive = active;
    this.trackingWin = active ? win : null;

    toggleListener(doc, 'pointerdown', this, active);
    toggleListener(doc, 'pointermove', this, active);
    toggleListener(doc, 'pointerup', this, active);
    toggleListener(doc, 'pointercancel', this, active);
    toggleListener(doc, 'visibilitychange', this, active);
    if (win) {
      toggleListener(win, 'blur', this, active);
    }
    this.surfaceGuard.setActive(active);
  }

  private clearClickSuppression(): void {
    this.disarmClickSuppression?.();
    this.disarmClickSuppression = null;
  }

  private processPointerDown(e: PointerEvent): void {
    this.clearClickSuppression();

    const motionEvent = this.stream.onPointerDown(e);
    if (!motionEvent) {
      return;
    }
    if (motionEvent.action === 'down' && this.pointerCapture.hasCaptures) {
      this.pointerCapture.releaseAll();
    }

    this.setActiveTracking(true);
    this.arena.dispatch(motionEvent);

    if (this.arena.hasActiveGesture) {
      this.pointerCapture.capture(this.stream.activePointerIds);
    }
  }

  private cancelPointer(e: PointerEvent): void {
    const motionEvent = this.stream.onPointerCancel(e);
    // Ignore pointers outside this stream (e.g. a finger natively scrolling elsewhere on the page).
    if (!motionEvent) {
      return;
    }
    this.arena.dispatch(motionEvent);
    this.stopTracking();
  }

  private abortActiveStream(triggerEvent: Event): void {
    const cancelEvent = this.stream.cancelAll(triggerEvent);
    if (cancelEvent) {
      this.arena.dispatch(cancelEvent);
    } else {
      this.arena.reset();
    }
    this.stopTracking();
  }

  private stopTracking(): void {
    this.pointerCapture.releaseAll();
    this.setActiveTracking(false);
  }
}
