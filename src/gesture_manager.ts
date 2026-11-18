import {GestureArena} from './gesture_arena.js';
import type {GestureRecognizer} from './gesture_recognizer.js';
import {MotionEventStream} from './motion_event.js';
import {
  allowsPinchZoom,
  applySurfaceBehavior,
  type GestureTarget,
  resolveSupportedTouchAction,
  type TouchActionSetting,
  type TouchActionValue,
} from './touch_behavior.js';

const GHOST_CLICK_TIMEOUT_MS = 400;
const NON_PASSIVE: AddEventListenerOptions = {passive: false};

function supportsGestureEvents(win: Window | null): boolean {
  return !!win && 'GestureEvent' in win;
}

function toggleListener(
  target: EventTarget,
  type: string,
  handler: EventListener,
  add: boolean,
  options?: AddEventListenerOptions | boolean
): void {
  if (add) {
    target.addEventListener(type, handler, options);
  } else {
    target.removeEventListener(type, handler, options);
  }
}

function toggleSafariGestures(target: EventTarget, handler: EventListener, add: boolean): void {
  toggleListener(target, 'gesturestart', handler, add, NON_PASSIVE);
  toggleListener(target, 'gesturechange', handler, add, NON_PASSIVE);
}

function isRelatedClickTarget(event: Event, element: GestureTarget): boolean {
  if (typeof event.composedPath === 'function' && event.composedPath().includes(element)) {
    return true;
  }
  return (
    event.target instanceof Node &&
    (element.contains(event.target) || event.target.contains(element))
  );
}

export type PointerType = 'touch' | 'pen' | 'mouse';

/** @internal */
export const DEFAULT_POINTER_TYPES: readonly PointerType[] = ['touch', 'pen', 'mouse'];

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
}

/**
 * Attaches DOM `PointerEvent` listeners to an `HTMLElement` or `SVGElement`, translates them
 * into unified `MotionEvent` snapshots via `MotionEventStream`, and arbitrates registered
 * `GestureRecognizer`s through `GestureArena`.
 */
export class GestureManager<T extends GestureTarget = GestureTarget> {
  readonly element: T;
  private readonly stream = new MotionEventStream();
  private readonly arena: GestureArena;
  private supportedPointerTypes: readonly PointerType[];
  private touchAction: TouchActionSetting;
  private readonly capturedPointers = new Set<number>();

  private unsetSurfaceBehavior: (() => void) | null = null;
  private disarmClickSuppression: (() => void) | null = null;
  private trackingActive = false;
  private trackingPinchZoom = false;
  private trackingWin: Window | null = null;
  private lastHandledDown: Event | null = null;
  private preventsPinchZoom = false;
  private suppressesTouchContextMenu = false;
  private destroyed = false;

  constructor(element: T, options: GestureManagerOptions = {}) {
    this.element = element;
    this.supportedPointerTypes = options.supportedPointerTypes ?? DEFAULT_POINTER_TYPES;
    this.touchAction = options.touchAction ?? 'compute';

    this.arena = new GestureArena({
      onActiveGestureStart: () => this.captureActivePointers(),
    });

    if (options.recognizers) {
      this.arena.setRecognizers(options.recognizers);
    }
    toggleListener(this.element, 'pointerdown', this.onElementPointerDown, true);
    toggleListener(this.element, 'lostpointercapture', this.onLostPointerCapture, true);
    this.syncTouchAction();
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
      this.syncTouchAction();
    }
    return this;
  }

  unregister(...recognizers: GestureRecognizer[]): this {
    if (!this.destroyed && recognizers.length > 0) {
      for (const recognizer of recognizers) {
        this.arena.remove(recognizer);
      }
      this.syncTouchAction();
    }
    return this;
  }

  setOptions(options: GestureManagerOptions): this {
    if (this.destroyed) {
      return this;
    }
    if (options.supportedPointerTypes !== undefined) {
      this.supportedPointerTypes = options.supportedPointerTypes;
      const activeType = this.stream.activePointerType;
      if (
        activeType !== null &&
        !(this.supportedPointerTypes as readonly string[]).includes(activeType)
      ) {
        this.abortActiveStream(new Event('cancel'));
      }
    }
    if (options.touchAction !== undefined) {
      this.touchAction = options.touchAction;
    }
    if (options.recognizers !== undefined) {
      this.arena.setRecognizers(options.recognizers);
      if (!this.arena.hasActiveGesture && this.capturedPointers.size > 0) {
        this.releaseAllCapturedPointers();
      }
    }
    this.syncTouchAction();
    return this;
  }

  reset(): void {
    this.clearClickSuppression();
    this.releaseAllCapturedPointers();
    this.setActiveTracking(false);
    this.stream.reset();
    this.arena.reset();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.clearClickSuppression();
    this.releaseAllCapturedPointers();
    this.setActiveTracking(false);
    toggleListener(this.element, 'pointerdown', this.onElementPointerDown, false);
    toggleListener(this.element, 'lostpointercapture', this.onLostPointerCapture, false);
    this.cleanupSurfaceBehavior();
    this.stream.reset();
    this.arena.destroy();
  }

  /**
   * Non-passive `touchmove` guard. Prevents native pinch-zoom when a recognizer claims it, and
   * native scrolling while a gesture owns the stream. Scroll ownership only applies to touches
   * that started on `element` (touch events always target their `touchstart` element).
   */
  private readonly onTouchMove: EventListener = (ev: Event): void => {
    const e = ev as TouchEvent;
    if (!e.cancelable) {
      return;
    }
    const isGuardedPinch = this.preventsPinchZoom && !!e.touches && e.touches.length >= 2;
    const ownsScroll = e.currentTarget === this.element && this.arena.shouldPreventTouchMove;
    if (isGuardedPinch || ownsScroll) {
      e.preventDefault();
    }
  };

  /**
   * WebKit `gesturestart` / `gesturechange` guard: iOS Safari ignores `touch-action: pan-x pan-y`
   * for two-finger viewport zoom unless these proprietary events are prevented.
   */
  private readonly onSafariGesture: EventListener = (e: Event): void => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  /**
   * Keeps desktop mouse context menus native (aborting a mouse drag whose `pointerup` the menu
   * will swallow) while suppressing touch/pen long-press context menus on non-tap surfaces.
   */
  private readonly onContextMenu: EventListener = (e: Event): void => {
    const pointerType = (e as Partial<PointerEvent>).pointerType;
    if (pointerType === 'mouse' || this.stream.activePointerType === 'mouse') {
      if (this.stream.activePointerCount > 0) {
        this.abortActiveStream(e);
      }
      return;
    }
    const isSupportedNonMouse =
      (pointerType === 'touch' || pointerType === 'pen') &&
      (this.supportedPointerTypes as readonly string[]).includes(pointerType);
    if (
      this.suppressesTouchContextMenu &&
      (this.stream.activePointerCount > 0 || isSupportedNonMouse)
    ) {
      e.preventDefault();
    }
  };

  private readonly onElementPointerDown: EventListener = (ev: Event): void => {
    const e = ev as PointerEvent;
    this.lastHandledDown = e;
    if (this.isValidPointer(e)) {
      this.processPointerDown(e);
    }
  };

  private readonly onDocumentPointerDown: EventListener = (ev: Event): void => {
    const e = ev as PointerEvent;
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
      this.stream.activePointerType === 'touch'
    ) {
      this.processPointerDown(e);
      return;
    }
    // If a brand-new primary touch, pen, or mouse press starts outside `this.element`, any active
    // stream on `this.element` was orphaned by a swallowed `pointerup`; abort it cleanly.
    if (e.isPrimary === true || pointerType === 'mouse' || pointerType === 'pen') {
      this.abortActiveStream(e);
    }
  };

  private readonly onPointerMove: EventListener = (ev: Event): void => {
    const e = ev as PointerEvent;
    if (!this.isValidPointer(e)) {
      return;
    }
    if (this.stream.hasReleasedMouseButton(e)) {
      this.abortActiveStream(e);
      return;
    }
    const motionEvent = this.stream.onPointerMove(e);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }
  };

  private readonly onPointerUp: EventListener = (ev: Event): void => {
    const e = ev as PointerEvent;
    if (!this.isValidPointer(e)) {
      return;
    }
    const motionEvent = this.stream.onPointerUp(e);
    if (!motionEvent) {
      return;
    }
    this.arena.dispatch(motionEvent);
    this.releaseCapturedPointer(e.pointerId);
    if (this.stream.activePointerCount === 0) {
      if (this.arena.didSuppressingGestureWin) {
        this.armClickSuppression();
      }
      this.setActiveTracking(false);
    }
  };

  private readonly onPointerCancel: EventListener = (ev: Event): void => {
    const e = ev as PointerEvent;
    if (this.isValidPointer(e)) {
      this.cancelPointer(e);
    }
  };

  private readonly onLostPointerCapture: EventListener = (ev: Event): void => {
    // Ignore `lostpointercapture` bubbling up from child descendants losing implicit touch capture.
    if (ev.target !== this.element) {
      return;
    }
    const e = ev as PointerEvent;
    this.capturedPointers.delete(e.pointerId);
    this.cancelPointer(e);
  };

  private readonly onWindowBlur: EventListener = (e: Event): void => {
    this.abortActiveStream(e);
  };

  private readonly onVisibilityChange: EventListener = (e: Event): void => {
    if (this.element.ownerDocument.visibilityState === 'hidden') {
      this.abortActiveStream(e);
    }
  };

  private isValidPointer(e: PointerEvent): boolean {
    return (this.supportedPointerTypes as readonly string[]).includes(e.pointerType || 'touch');
  }

  private cleanupSurfaceBehavior(): void {
    this.unsetSurfaceBehavior?.();
    this.unsetSurfaceBehavior = null;
    this.preventsPinchZoom = false;
    this.suppressesTouchContextMenu = false;
  }

  private syncTouchAction(): void {
    this.cleanupSurfaceBehavior();
    if (this.destroyed || this.touchAction === false) {
      return;
    }

    const recognizers = this.arena.getRecognizers();
    if (recognizers.length === 0 && this.touchAction === 'compute') {
      return;
    }

    const supportsTouch = this.supportedPointerTypes.includes('touch');
    const supportsTouchOrPen = supportsTouch || this.supportedPointerTypes.includes('pen');

    const resolvedAction: TouchActionValue | null =
      this.touchAction === 'compute'
        ? supportsTouchOrPen
          ? this.arena.computeTouchAction()
          : null
        : resolveSupportedTouchAction(this.touchAction);

    const hasNonTapRecognizer = recognizers.some(r => r.suppressesClick);
    const preventsPinchZoom =
      supportsTouch &&
      resolvedAction !== null &&
      (!allowsPinchZoom(resolvedAction) ||
        recognizers.some(r => !allowsPinchZoom(r.getTouchAction())));

    this.preventsPinchZoom = preventsPinchZoom;
    this.suppressesTouchContextMenu = hasNonTapRecognizer && supportsTouchOrPen;

    const el = this.element;
    const restoreStyles = applySurfaceBehavior(el, resolvedAction, hasNonTapRecognizer);
    const bindTouchMove =
      supportsTouch && hasNonTapRecognizer && resolvedAction !== null && resolvedAction !== 'none';
    const bindSafariGestures =
      preventsPinchZoom &&
      recognizers.length > 0 &&
      supportsGestureEvents(el.ownerDocument.defaultView);

    const toggleSurfaceListeners = (add: boolean) => {
      if (hasNonTapRecognizer) {
        toggleListener(el, 'contextmenu', this.onContextMenu, add);
        if (bindTouchMove) {
          toggleListener(el, 'touchmove', this.onTouchMove, add, NON_PASSIVE);
        }
      }
      if (bindSafariGestures) {
        toggleSafariGestures(el, this.onSafariGesture, add);
      }
    };

    toggleSurfaceListeners(true);
    this.unsetSurfaceBehavior = () => {
      toggleSurfaceListeners(false);
      restoreStyles();
    };
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
    const guardPinch = active ? this.preventsPinchZoom : this.trackingPinchZoom;

    this.trackingActive = active;
    this.trackingWin = active ? win : null;
    this.trackingPinchZoom = active && guardPinch;

    toggleListener(doc, 'pointerdown', this.onDocumentPointerDown, active);
    toggleListener(doc, 'pointermove', this.onPointerMove, active);
    toggleListener(doc, 'pointerup', this.onPointerUp, active);
    toggleListener(doc, 'pointercancel', this.onPointerCancel, active);
    toggleListener(doc, 'contextmenu', this.onContextMenu, active);
    toggleListener(doc, 'visibilitychange', this.onVisibilityChange, active);
    if (win) {
      toggleListener(win, 'blur', this.onWindowBlur, active);
    }

    // Straddling pinches whose second finger lands outside `element` dispatch touch/gesture
    // events to other targets, so mirror the pinch-zoom guards on the document while active.
    if (guardPinch) {
      toggleListener(doc, 'touchmove', this.onTouchMove, active, NON_PASSIVE);
      if (supportsGestureEvents(win)) {
        toggleSafariGestures(doc, this.onSafariGesture, active);
      }
    }
  }

  private clearClickSuppression(): void {
    this.disarmClickSuppression?.();
    this.disarmClickSuppression = null;
  }

  private armClickSuppression(): void {
    this.clearClickSuppression();
    const doc = this.element.ownerDocument;
    const suppressUntil = performance.now() + GHOST_CLICK_TIMEOUT_MS;

    const onPointerDown = () => {
      this.clearClickSuppression();
    };
    const onClickCapture = (e: Event) => {
      if (performance.now() > suppressUntil) {
        this.clearClickSuppression();
        return;
      }
      // `detail === 0` marks programmatic / keyboard-activated clicks, which are never ghosts.
      if ((e as MouseEvent).detail === 0 || !isRelatedClickTarget(e, this.element)) {
        return;
      }
      this.clearClickSuppression();
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    toggleListener(doc, 'pointerdown', onPointerDown, true, true);
    toggleListener(doc, 'click', onClickCapture, true, true);
    this.disarmClickSuppression = () => {
      toggleListener(doc, 'click', onClickCapture, false, true);
      toggleListener(doc, 'pointerdown', onPointerDown, false, true);
    };
  }

  private processPointerDown(e: PointerEvent): void {
    this.clearClickSuppression();

    const motionEvent = this.stream.onPointerDown(e);
    if (!motionEvent) {
      return;
    }
    if (motionEvent.action === 'down' && this.capturedPointers.size > 0) {
      this.releaseAllCapturedPointers();
    }

    this.setActiveTracking(true);
    this.arena.dispatch(motionEvent);

    if (this.arena.hasActiveGesture) {
      this.captureActivePointers();
    }
  }

  private cancelPointer(e: PointerEvent): void {
    const motionEvent = this.stream.onPointerCancel(e);
    // Ignore pointers outside this stream (e.g. a finger natively scrolling elsewhere on the page).
    if (!motionEvent) {
      return;
    }
    this.arena.dispatch(motionEvent);
    this.releaseAllCapturedPointers();
    this.setActiveTracking(false);
  }

  private abortActiveStream(triggerEvent: Event): void {
    const cancelEvent = this.stream.cancelAll(triggerEvent);
    if (cancelEvent) {
      this.arena.dispatch(cancelEvent);
    }
    this.releaseAllCapturedPointers();
    this.setActiveTracking(false);
  }

  private captureActivePointers(): void {
    for (const pointerId of this.stream.activePointerIds) {
      if (this.capturedPointers.has(pointerId)) {
        continue;
      }
      try {
        this.element.setPointerCapture(pointerId);
        this.capturedPointers.add(pointerId);
      } catch {
        // `NotFoundError` if the pointer is no longer active (e.g. lifted between events).
      }
    }
  }

  private releaseCapturedPointer(pointerId: number): void {
    if (!this.capturedPointers.delete(pointerId)) {
      return;
    }
    try {
      if (this.element.hasPointerCapture(pointerId)) {
        this.element.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore if pointer capture was already released.
    }
  }

  private releaseAllCapturedPointers(): void {
    for (const pointerId of this.capturedPointers) {
      this.releaseCapturedPointer(pointerId);
    }
  }
}
