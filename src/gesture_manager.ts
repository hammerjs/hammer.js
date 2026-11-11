import {GestureArena} from './gesture_arena.js';
import type {GestureRecognizer} from './gesture_recognizer.js';
import {MotionAction, MotionEventStream} from './motion_event.js';
import {
  allowsPinchZoom,
  applySurfaceBehavior,
  type GestureTarget,
  resolveSupportedTouchAction,
  type TouchActionSetting,
  type TouchActionValue,
} from './touch_behavior.js';
import type {ViewConfiguration} from './view_configuration.js';

type Cleanup = () => void;

/** Adds an event listener and returns its matching removal. */
function listen(
  target: EventTarget,
  type: string,
  handler: (e: never) => void,
  options?: AddEventListenerOptions | boolean
): Cleanup {
  const listener = handler as EventListener;
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
}

function runAll(cleanups: readonly Cleanup[]): void {
  for (let i = cleanups.length - 1; i >= 0; i--) {
    cleanups[i]();
  }
}

function supportsGestureEvents(win: Window | null): boolean {
  return !!win && 'GestureEvent' in win;
}

function isRelatedClickTarget(event: Event, element: GestureTarget): boolean {
  if (typeof event.composedPath === 'function' && event.composedPath().includes(element)) {
    return true;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return true;
  }
  let current: Node | null = element;
  while (current) {
    if (target.contains(current)) {
      return true;
    }
    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : null;
  }
  return false;
}

export interface GestureManagerOptions {
  /**
   * Pointer device types to observe (`'touch'`, `'pen'`, `'mouse'`).
   * Default: `['touch', 'pen', 'mouse']`.
   */
  supportedPointerTypes: readonly ('mouse' | 'touch' | 'pen' | (string & {}))[];
  /**
   * CSS `touch-action` & mobile coexistence policy:
   * - `'compute'` (default): automatically derives the least-restrictive W3C
   *   `touch-action` from registered recognizers (`Tap`/`LongPress`/`QuickScale` -> `'manipulation'`,
   *   horizontal `Pan` -> `'pan-y pinch-zoom'`, `Scale`/`Rotate` -> `'pan-x pan-y'`,
   *   2D `Pan` -> `'none'`) so mobile pages never suffer accidental scroll-locks.
   * - Any explicit `TouchActionValue` (e.g. `'pan-y'`, `'manipulation'`, `'none'`).
   * - `false`: leaves element inline styles and extra touch/selection guards untouched.
   */
  touchAction: TouchActionSetting;
  /** Optional overrides for gesture slops, timeouts, and velocity bounds. */
  viewConfiguration?: Partial<ViewConfiguration>;
  /** Optional initial recognizers to register at construction. */
  recognizers?: GestureRecognizer[];
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
  private readonly options: {
    supportedPointerTypes: GestureManagerOptions['supportedPointerTypes'];
    touchAction: TouchActionSetting;
    viewConfiguration?: Partial<ViewConfiguration>;
  };
  private readonly capturedPointers = new Set<number>();
  private readonly unbindEvents: Cleanup;

  private unsetSurfaceBehavior: Cleanup | null = null;
  private unbindActiveTracking: Cleanup | null = null;
  private disarmClickSuppression: Cleanup | null = null;
  private lastHandledDown: Event | null = null;
  private appliedSurfaceKey = '';
  private preventsPinchZoom = false;
  private suppressesTouchContextMenu = false;
  private destroyed = false;

  static readonly DEFAULTS: GestureManagerOptions = Object.freeze({
    supportedPointerTypes: Object.freeze(['touch', 'pen', 'mouse']),
    touchAction: 'compute' as const,
  });

  constructor(element: T, options: Partial<GestureManagerOptions> = {}) {
    this.element = element;
    this.options = {
      supportedPointerTypes:
        options.supportedPointerTypes ?? GestureManager.DEFAULTS.supportedPointerTypes,
      touchAction: options.touchAction ?? GestureManager.DEFAULTS.touchAction,
      viewConfiguration: options.viewConfiguration,
    };

    this.arena = new GestureArena(this.options.viewConfiguration, {
      onActiveGestureStart: () => this.captureActivePointers(),
    });

    for (const recognizer of options.recognizers ?? []) {
      this.arena.add(recognizer);
    }
    this.unbindEvents = this.bindEvents();
    this.syncTouchAction();
  }

  get config(): ViewConfiguration {
    return this.arena.config;
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

  setOptions(
    options: Partial<
      Pick<GestureManagerOptions, 'supportedPointerTypes' | 'touchAction' | 'viewConfiguration'>
    >
  ): this {
    if (this.destroyed) {
      return this;
    }
    if (options.supportedPointerTypes !== undefined) {
      this.options.supportedPointerTypes = options.supportedPointerTypes;
    }
    if (options.touchAction !== undefined) {
      this.options.touchAction = options.touchAction;
    }
    if (options.viewConfiguration !== undefined) {
      this.options.viewConfiguration = options.viewConfiguration;
      this.arena.setConfig(options.viewConfiguration);
    }
    this.syncTouchAction();
    return this;
  }

  reset(): void {
    this.clearClickSuppression();
    this.releaseAllCapturedPointers();
    this.stopActiveTracking();
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
    this.stopActiveTracking();
    this.unbindEvents();
    this.cleanupSurfaceBehavior();
    this.stream.reset();
    this.arena.destroy();
  }

  /**
   * Non-passive `touchmove` guard. Prevents native pinch-zoom when a recognizer claims it, and
   * native scrolling while a gesture owns the stream. Scroll ownership only applies to touches
   * that started on `element` (touch events always target their `touchstart` element).
   */
  private readonly onTouchMove = (e: TouchEvent): void => {
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
  private readonly onSafariGesture = (e: Event): void => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  /**
   * Keeps desktop mouse context menus native (aborting a mouse drag whose `pointerup` the menu
   * will swallow) while suppressing touch/pen long-press context menus on non-tap surfaces.
   */
  private readonly onContextMenu = (e: Event): void => {
    const pointerType = (e as Partial<PointerEvent>).pointerType;
    if (pointerType === 'mouse' || this.stream.activePointerType === 'mouse') {
      if (this.stream.activePointerCount > 0) {
        this.abortActiveStream(e);
      }
      return;
    }
    if (
      this.suppressesTouchContextMenu &&
      (this.stream.activePointerCount > 0 || pointerType === 'touch' || pointerType === 'pen')
    ) {
      e.preventDefault();
    }
  };

  private readonly onElementPointerDown = (e: PointerEvent): void => {
    this.lastHandledDown = e;
    if (this.isValidPointer(e)) {
      this.processPointerDown(e);
    }
  };

  private readonly onDocumentPointerDown = (e: PointerEvent): void => {
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

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (this.stream.activePointerCount === 0 || !this.isValidPointer(e)) {
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

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (this.stream.activePointerCount === 0 || !this.isValidPointer(e)) {
      return;
    }
    const motionEvent = this.stream.onPointerUp(e);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }
    this.releaseCapturedPointer(e.pointerId);
    if (this.stream.activePointerCount === 0) {
      if (this.arena.didSuppressingGestureWin) {
        this.armClickSuppression();
      }
      this.stopActiveTracking();
    }
  };

  private readonly onPointerCancel = (e: PointerEvent): void => {
    if (this.stream.activePointerCount === 0 || !this.isValidPointer(e)) {
      return;
    }
    this.cancelPointer(e);
  };

  private readonly onLostPointerCapture = (e: PointerEvent): void => {
    // Ignore `lostpointercapture` bubbling up from child descendants losing implicit touch capture.
    if (e.target !== this.element) {
      return;
    }
    this.capturedPointers.delete(e.pointerId);
    this.cancelPointer(e);
  };

  private readonly onWindowBlur = (e: Event): void => {
    this.abortActiveStream(e);
  };

  private readonly onVisibilityChange = (e: Event): void => {
    if (this.element.ownerDocument.visibilityState === 'hidden') {
      this.abortActiveStream(e);
    }
  };

  private isValidPointer(e: PointerEvent): boolean {
    return this.options.supportedPointerTypes.includes(e.pointerType || 'touch');
  }

  private cleanupSurfaceBehavior(): void {
    this.unsetSurfaceBehavior?.();
    this.unsetSurfaceBehavior = null;
    this.appliedSurfaceKey = '';
    this.preventsPinchZoom = false;
    this.suppressesTouchContextMenu = false;
  }

  private syncTouchAction(): void {
    if (this.destroyed || this.options.touchAction === false) {
      this.cleanupSurfaceBehavior();
      return;
    }

    const recognizers = this.arena.getRecognizers();
    if (recognizers.length === 0 && this.options.touchAction === 'compute') {
      this.cleanupSurfaceBehavior();
      return;
    }

    const resolvedAction =
      this.options.touchAction === 'compute'
        ? this.arena.computeTouchAction()
        : resolveSupportedTouchAction(this.options.touchAction);

    const hasNonTapRecognizer = recognizers.some(r => r.suppressesClick);
    const preventsPinchZoom =
      !allowsPinchZoom(resolvedAction) ||
      recognizers.some(r => !allowsPinchZoom(r.getTouchAction()));

    const nextKey = `${resolvedAction}|${hasNonTapRecognizer ? 1 : 0}|${preventsPinchZoom ? 1 : 0}`;
    if (nextKey === this.appliedSurfaceKey) {
      return;
    }

    this.cleanupSurfaceBehavior();
    this.appliedSurfaceKey = nextKey;
    this.preventsPinchZoom = preventsPinchZoom;
    this.suppressesTouchContextMenu = hasNonTapRecognizer;

    const el = this.element;
    const cleanups: Cleanup[] = [applySurfaceBehavior(el, resolvedAction, hasNonTapRecognizer)];

    if (hasNonTapRecognizer) {
      cleanups.push(listen(el, 'contextmenu', this.onContextMenu));
      if (resolvedAction !== 'none') {
        cleanups.push(listen(el, 'touchmove', this.onTouchMove, {passive: false}));
      }
    }

    if (
      preventsPinchZoom &&
      recognizers.length > 0 &&
      supportsGestureEvents(el.ownerDocument.defaultView)
    ) {
      cleanups.push(
        listen(el, 'gesturestart', this.onSafariGesture, {passive: false}),
        listen(el, 'gesturechange', this.onSafariGesture, {passive: false})
      );
    }

    this.unsetSurfaceBehavior = () => runAll(cleanups);
  }

  private bindEvents(): Cleanup {
    const cleanups = [
      listen(this.element, 'pointerdown', this.onElementPointerDown),
      listen(this.element, 'lostpointercapture', this.onLostPointerCapture),
    ];
    return () => runAll(cleanups);
  }

  /** Attaches document-level listeners for the lifetime of a single pointer stream. */
  private ensureActiveTracking(): void {
    if (this.unbindActiveTracking) {
      return;
    }

    const doc = this.element.ownerDocument;
    const win = doc.defaultView;
    const cleanups: Cleanup[] = [
      listen(doc, 'pointerdown', this.onDocumentPointerDown),
      listen(doc, 'pointermove', this.onPointerMove),
      listen(doc, 'pointerup', this.onPointerUp),
      listen(doc, 'pointercancel', this.onPointerCancel),
      listen(doc, 'contextmenu', this.onContextMenu),
      listen(doc, 'visibilitychange', this.onVisibilityChange),
    ];
    if (win) {
      cleanups.push(listen(win, 'blur', this.onWindowBlur));
    }

    // Straddling pinches whose second finger lands outside `element` dispatch touch/gesture
    // events to other targets, so mirror the pinch-zoom guards on the document while active.
    if (this.preventsPinchZoom) {
      cleanups.push(listen(doc, 'touchmove', this.onTouchMove, {passive: false}));
      if (supportsGestureEvents(win)) {
        cleanups.push(
          listen(doc, 'gesturestart', this.onSafariGesture, {passive: false}),
          listen(doc, 'gesturechange', this.onSafariGesture, {passive: false})
        );
      }
    }

    this.unbindActiveTracking = () => runAll(cleanups);
  }

  private stopActiveTracking(): void {
    this.lastHandledDown = null;
    this.unbindActiveTracking?.();
    this.unbindActiveTracking = null;
  }

  private clearClickSuppression(): void {
    this.disarmClickSuppression?.();
    this.disarmClickSuppression = null;
  }

  private armClickSuppression(): void {
    this.clearClickSuppression();
    const doc = this.element.ownerDocument;
    const suppressUntil = performance.now() + this.config.ghostClickTimeout;

    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() > suppressUntil) {
        this.clearClickSuppression();
        return;
      }
      // `detail === 0` marks programmatic / keyboard-activated clicks, which are never ghosts.
      if (e.detail === 0 || !isRelatedClickTarget(e, this.element)) {
        return;
      }
      this.clearClickSuppression();
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    const cleanups = [
      listen(doc, 'pointerdown', () => this.clearClickSuppression(), true),
      listen(doc, 'click', onClickCapture, true),
    ];
    this.disarmClickSuppression = () => runAll(cleanups);
  }

  private processPointerDown(e: PointerEvent): void {
    this.clearClickSuppression();

    const motionEvent = this.stream.onPointerDown(e);
    if (!motionEvent) {
      return;
    }
    if (motionEvent.action === MotionAction.DOWN && this.capturedPointers.size > 0) {
      this.releaseAllCapturedPointers();
    }

    this.ensureActiveTracking();
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
    this.stopActiveTracking();
  }

  private abortActiveStream(triggerEvent: Event): void {
    const cancelEvent = this.stream.cancelAll(triggerEvent);
    if (cancelEvent) {
      this.arena.dispatch(cancelEvent);
    }
    this.releaseAllCapturedPointers();
    this.stopActiveTracking();
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
