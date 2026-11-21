import {type GestureDescriptor, resolveGestures} from './descriptors.js';
import {isComposedAncestor, isEditableOrFormControl, ListenerBag} from './dom_utils.js';
import {GestureArena} from './gesture_arena.js';
import type {GestureRecognizer} from './gesture_recognizer.js';
import {MotionEventStream} from './motion_event_stream.js';
import {PointerCapture} from './pointer_capture.js';
import {SurfaceGuard} from './surface_guard.js';
import type {GestureTargetElement, TouchActionSetting, TouchActionValue} from './touch_action.js';

export type PointerType = 'touch' | 'pen' | 'mouse';

const DEFAULT_POINTER_TYPES: readonly PointerType[] = ['touch', 'pen', 'mouse'];
// Tracks only managers with an in-flight pointer stream (added on down, removed on end/cancel)
// so nested-surface cancellation can find competing ancestors/descendants without retaining idle managers.
const activeManagers = new Set<GestureManager>();

export interface GestureManagerOptions {
  /**
   * Whether gesture recognition and surface guards (`touch-action`, `user-select`, listeners)
   * are active. Set to `false` to disable gestures without tearing down references. Default: `true`.
   */
  enabled?: boolean;
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
  /** Tree-shakable gesture descriptors to materialize and register in the arena. */
  gestures?: readonly GestureDescriptor[];
  /**
   * Whether `gestures` should automatically wire standard relationships (e.g. `tap` waiting on
   * `doubleTap`/`quickScale`, `scale` simultaneous with `rotate`). Default: `true`.
   */
  autoWire?: boolean;
  /** Recognizers to register directly in the gesture arena. */
  recognizers?: readonly GestureRecognizer[];
  /**
   * Controls whether pointer presses originating on interactive form controls
   * (`<input>`, `<textarea>`, `<select>`, `<option>`, `[contenteditable]`) are ignored
   * so native typing, text selection, and range-slider drags remain unobstructed.
   * - `true` (default): ignores native form/editable controls inside `element`.
   * - `false`: observes all targets including form controls.
   * - `(target: EventTarget, event: Event) => boolean`: custom predicate returning `true` to ignore.
   */
  ignoreTarget?: boolean | ((target: EventTarget, event: Event) => boolean);
  /**
   * Controls coordination across nested `GestureManager` surfaces sharing a pointer stream:
   * - `false` (default): winning a gesture cancels competing ancestor managers (and descendant
   *   managers when a continuous gesture claims the stream), so only one surface handles it.
   * - `true`: opts this surface out of cross-manager cancellation (neither cancels nested
   *   surfaces nor gets cancelled by them).
   */
  propagate?: boolean;
}

/**
 * Attaches DOM `PointerEvent` listeners to an `HTMLElement` or `SVGElement`, translates them
 * into unified `MotionEvent` snapshots via `MotionEventStream`, and arbitrates registered
 * `GestureRecognizer`s through `GestureArena`.
 */
export class GestureManager<
  T extends GestureTargetElement = GestureTargetElement,
> implements EventListenerObject {
  readonly element: T;
  private readonly stream = new MotionEventStream();
  private readonly arena: GestureArena;
  private readonly pointerCapture: PointerCapture;
  private readonly surfaceGuard: SurfaceGuard;
  private readonly elementListeners = new ListenerBag();
  private readonly trackingListeners = new ListenerBag();
  private readonly supportedPointerTypes: readonly PointerType[];
  private readonly ignoreTarget: boolean | ((target: EventTarget, event: Event) => boolean);
  private readonly propagate: boolean;

  private trackingActive = false;
  private lastHandledDown: Event | null = null;
  private dispatchingPointerId: number | null = null;
  private destroyed = false;

  constructor(element: T, options: GestureManagerOptions = {}) {
    this.element = element;
    const enabled = options.enabled !== false;
    this.pointerCapture = new PointerCapture(
      element,
      enabled ? e => this.cancelPointer(e) : undefined
    );
    this.supportedPointerTypes = options.supportedPointerTypes ?? DEFAULT_POINTER_TYPES;
    this.ignoreTarget = options.ignoreTarget ?? true;
    this.propagate = options.propagate ?? false;

    const initialRecognizers: GestureRecognizer[] = enabled
      ? [
          ...(options.gestures
            ? resolveGestures(options.gestures, {autoWire: options.autoWire})
            : []),
          ...(options.recognizers ?? []),
        ]
      : [];

    this.arena = new GestureArena(initialRecognizers, {
      onGestureClaim: targetState => this.onGestureClaim(targetState),
    });

    const recognizers = this.arena.getRecognizers();
    this.surfaceGuard = new SurfaceGuard({
      element,
      touchAction: enabled ? (options.touchAction ?? 'compute') : false,
      supportedPointerTypes: this.supportedPointerTypes,
      actions: recognizers.map(r => r.getTouchAction()),
      hasContinuousRecognizer: recognizers.some(r => r.gestureKind === 'continuous'),
      shouldIgnoreEvent: e => this.shouldIgnoreTarget(e),
      shouldPreventTouchMove: () => this.arena.shouldPreventTouchMove,
      getActivePointerType: () => this.stream.activePointerType,
      onAbortActiveStream: e => this.abortActiveStream(e),
    });

    if (enabled) {
      this.elementListeners.add(this.element, 'pointerdown', this);
    }
  }

  /** Returns the W3C CSS `touch-action` computed from the registered recognizers. */
  computeTouchAction(): TouchActionValue {
    return this.arena.computeTouchAction();
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
    this.surfaceGuard.clearClickSuppression();
    this.abortActiveStream(new Event('cancel'));
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.stopTracking();
    this.elementListeners.clear();
    this.pointerCapture.destroy();
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
    // `stream.onPointerUp` removes `e.pointerId` before dispatch; keep it visible during
    // dispatch so discrete gestures claiming on lift (e.g. `tap`) still match nested managers.
    this.dispatchingPointerId = e.pointerId;
    try {
      this.arena.dispatch(motionEvent);
    } finally {
      this.dispatchingPointerId = null;
    }
    this.pointerCapture.release(e.pointerId);
    if (this.stream.activePointerCount === 0) {
      if (this.arena.didSuppressingGestureWin) {
        this.surfaceGuard.armClickSuppression();
      }
      this.setActiveTracking(false);
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
      return this.ignoreTarget(target, e);
    }
    return isEditableOrFormControl(target, boundary, path);
  }

  private isValidPointer(e: PointerEvent): boolean {
    return (this.supportedPointerTypes as readonly string[]).includes(e.pointerType || 'touch');
  }

  /** Attaches or detaches document-level listeners for the lifetime of a single pointer stream. */
  private setActiveTracking(active: boolean): void {
    if (!active) {
      this.lastHandledDown = null;
    }
    if (this.trackingActive === active) {
      return;
    }

    this.trackingActive = active;
    this.trackingListeners.clear();
    if (active) {
      activeManagers.add(this);
      const doc = this.element.ownerDocument;
      this.trackingListeners.add(doc, 'pointerdown', this);
      this.trackingListeners.add(doc, 'pointermove', this);
      this.trackingListeners.add(doc, 'pointerup', this);
      this.trackingListeners.add(doc, 'pointercancel', this);
      this.trackingListeners.add(doc, 'visibilitychange', this);
      if (doc.defaultView) {
        this.trackingListeners.add(doc.defaultView, 'blur', this);
      }
    } else {
      activeManagers.delete(this);
    }
    this.surfaceGuard.setActive(active);
  }

  private onGestureClaim(targetState: 'began' | 'ended'): void {
    // Skip explicit pointer capture when `propagate: true` so nested continuous surfaces
    // never steal capture from each other and trigger `lostpointercapture` aborts.
    if (targetState === 'began' && !this.propagate) {
      this.pointerCapture.capture(this.stream.activePointerIds);
    }
    if (this.propagate) {
      return;
    }
    for (const other of activeManagers) {
      if (other === this || other.propagate || !this.sharesPointerWith(other)) {
        continue;
      }
      if (
        isComposedAncestor(other.element, this.element) ||
        (targetState === 'began' && isComposedAncestor(this.element, other.element))
      ) {
        other.abortActiveStream(new Event('cancel'));
      }
    }
  }

  private sharesPointerWith(other: GestureManager): boolean {
    for (const id of this.stream.activePointerIds) {
      if (other.stream.hasPointer(id)) {
        return true;
      }
    }
    return this.dispatchingPointerId !== null && other.stream.hasPointer(this.dispatchingPointerId);
  }

  private processPointerDown(e: PointerEvent): void {
    this.surfaceGuard.clearClickSuppression();

    const motionEvent = this.stream.onPointerDown(e);
    if (!motionEvent) {
      return;
    }
    if (motionEvent.action === 'down' && this.pointerCapture.hasCaptures) {
      this.pointerCapture.releaseAll();
    }

    this.setActiveTracking(true);
    this.arena.dispatch(motionEvent);

    if (this.arena.hasActiveGesture && !this.propagate) {
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
