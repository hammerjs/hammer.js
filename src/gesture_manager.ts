import {GestureArena} from './gesture_arena';
import type {GestureRecognizer} from './gesture_recognizer';
import {type MotionEvent, MotionEventStream} from './motion_event';
import {
  allowsPinchZoom,
  applySurfaceBehavior,
  resolveSupportedTouchAction,
  type TouchActionSetting,
  type TouchActionValue,
} from './touch_behavior';
import type {ViewConfiguration} from './view_configuration';

const GHOST_CLICK_WINDOW_MS = 400;

export interface GestureManagerOptions {
  /**
   * Pointer device types to observe (`'touch'`, `'pen'`, `'mouse'`).
   * Default: `['touch', 'pen', 'mouse']`.
   */
  supportedPointerTypes: ('mouse' | 'touch' | 'pen' | string)[];
  /**
   * CSS `touch-action` & mobile coexistence policy:
   * - `'compute'` (default): automatically derives the least-restrictive W3C
   *   `touch-action` from registered recognizers (`Tap`/`LongPress` -> `'manipulation'`,
   *   horizontal `Pan`/`Fling` -> `'pan-y pinch-zoom'`, `Scale`/`Rotate` -> `'pan-x pan-y'`,
   *   2D `Pan` -> `'none'`) so mobile pages never suffer accidental scroll-locks.
   * - Any explicit `TouchActionValue` (e.g. `'pan-y'`, `'manipulation'`, `'none'`).
   * - `false`: leaves element inline styles and extra touch/selection guards untouched.
   */
  touchAction: TouchActionSetting;
  /** Optional overrides for gesture slops, timeouts, and velocity bounds. */
  viewConfiguration?: Partial<ViewConfiguration>;
}

/**
 * Attaches DOM `PointerEvent` listeners to an `HTMLElement`, translates them into
 * unified `MotionEvent` snapshots via `MotionEventStream`, and arbitrates registered
 * `GestureRecognizer`s through `GestureArena`.
 */
export class GestureManager {
  readonly element: HTMLElement;
  private readonly stream: MotionEventStream;
  private readonly arena: GestureArena;
  private readonly options: GestureManagerOptions;
  private readonly unbindEvents: () => void;
  private readonly capturedPointers = new Set<number>();

  private unsetSurfaceBehavior: (() => void) | null = null;
  private unbindDocumentTracking: (() => void) | null = null;
  private lastProcessedEvent: Event | null = null;
  private suppressClickUntil = 0;
  private destroyed = false;

  static DEFAULTS: GestureManagerOptions = {
    supportedPointerTypes: ['touch', 'pen', 'mouse'],
    touchAction: 'compute',
  };

  constructor(element: HTMLElement, options: Partial<GestureManagerOptions> = {}) {
    this.element = element;
    this.options = {
      ...GestureManager.DEFAULTS,
      ...options,
    };

    this.stream = new MotionEventStream();
    this.arena = new GestureArena(this.options.viewConfiguration, {
      onActiveGestureStart: () => this.captureActivePointers(),
    });
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

  register(recognizer: GestureRecognizer): this {
    if (!this.destroyed) {
      this.arena.add(recognizer);
      this.syncTouchAction();
    }
    return this;
  }

  unregister(recognizer: GestureRecognizer): this {
    if (!this.destroyed) {
      this.arena.remove(recognizer);
      this.syncTouchAction();
    }
    return this;
  }

  /** Directly dispatches a `MotionEvent` into the underlying `GestureArena`. */
  onTouchEvent(event: MotionEvent): void {
    if (!this.destroyed) {
      this.arena.dispatch(event);
    }
  }

  reset(): void {
    this.suppressClickUntil = 0;
    this.releaseAllCapturedPointers();
    this.stopDocumentTracking();
    this.stream.reset();
    this.arena.reset();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.suppressClickUntil = 0;
    this.releaseAllCapturedPointers();
    this.stopDocumentTracking();
    this.unbindEvents();
    this.cleanupSurfaceBehavior();
    this.stream.reset();
    this.arena.destroy();
  }

  private isValidPointer(e: PointerEvent): boolean {
    return this.options.supportedPointerTypes.includes(e.pointerType);
  }

  private cleanupSurfaceBehavior(): void {
    if (this.unsetSurfaceBehavior) {
      this.unsetSurfaceBehavior();
      this.unsetSurfaceBehavior = null;
    }
  }

  private syncTouchAction(): void {
    this.cleanupSurfaceBehavior();
    if (this.destroyed || this.options.touchAction === false) {
      return;
    }

    const recognizers = this.arena.getRecognizers();
    if (recognizers.length === 0 && this.options.touchAction === 'compute') {
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

    const cleanups: Array<() => void> = [
      applySurfaceBehavior(this.element, resolvedAction, hasNonTapRecognizer),
    ];

    if (hasNonTapRecognizer) {
      // Suppress touch/stylus long-press context menus while preserving desktop right-click.
      const onContextMenu = (e: Event) => {
        const pType = (e as Partial<PointerEvent>).pointerType;
        if (this.stream.activePointerCount > 0 || pType === 'touch' || pType === 'pen') {
          e.preventDefault();
        }
      };
      this.element.addEventListener('contextmenu', onContextMenu);
      cleanups.push(() => this.element.removeEventListener('contextmenu', onContextMenu));
    }

    // 1. Selective `{passive: false}` `touchmove` guard (never attached on `Tap`-only surfaces
    //    or when CSS `touch-action: none` already blocks compositor scrolling).
    if (hasNonTapRecognizer && resolvedAction !== 'none') {
      const onTouchMove = (e: TouchEvent) => {
        if (!e.cancelable) {
          return;
        }
        if (
          this.arena.shouldPreventTouchMove ||
          (preventsPinchZoom && e.touches && e.touches.length >= 2)
        ) {
          e.preventDefault();
        }
      };
      this.element.addEventListener('touchmove', onTouchMove, {passive: false});
      cleanups.push(() => this.element.removeEventListener('touchmove', onTouchMove));
    }

    // 2. WebKit / iOS Safari `GestureEvent` (`gesturestart` / `gesturechange`) guard:
    //    iOS Safari ignores `touch-action: pan-x pan-y` for 2-finger viewport zoom unless
    //    `gesturestart`/`gesturechange` is prevented.
    const win = this.element.ownerDocument.defaultView;
    if (preventsPinchZoom && recognizers.length > 0 && win && 'GestureEvent' in win) {
      const onSafariGesture = (e: Event) => {
        if (e.cancelable) {
          e.preventDefault();
        }
      };
      this.element.addEventListener('gesturestart', onSafariGesture, {passive: false});
      this.element.addEventListener('gesturechange', onSafariGesture, {passive: false});
      cleanups.push(() => {
        this.element.removeEventListener('gesturestart', onSafariGesture);
        this.element.removeEventListener('gesturechange', onSafariGesture);
      });
    }

    this.unsetSurfaceBehavior = () => {
      for (let i = cleanups.length - 1; i >= 0; i--) {
        cleanups[i]();
      }
    };
  }

  private bindEvents(): () => void {
    const onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
    const onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
    const onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
    const onPointerCancel = (e: PointerEvent) => this.handlePointerCancel(e);
    const onLostCapture = (e: PointerEvent) => this.handleLostPointerCapture(e);
    const onClickCapture = (e: MouseEvent) => this.handleClickCapture(e);

    this.element.addEventListener('pointerdown', onPointerDown);
    this.element.addEventListener('pointermove', onPointerMove);
    this.element.addEventListener('pointerup', onPointerUp);
    this.element.addEventListener('pointercancel', onPointerCancel);
    this.element.addEventListener('lostpointercapture', onLostCapture);
    this.element.addEventListener('click', onClickCapture, true);

    return () => {
      this.element.removeEventListener('pointerdown', onPointerDown);
      this.element.removeEventListener('pointermove', onPointerMove);
      this.element.removeEventListener('pointerup', onPointerUp);
      this.element.removeEventListener('pointercancel', onPointerCancel);
      this.element.removeEventListener('lostpointercapture', onLostCapture);
      this.element.removeEventListener('click', onClickCapture, true);
    };
  }

  private ensureDocumentTracking(): void {
    if (this.unbindDocumentTracking || !this.element.isConnected) {
      return;
    }
    const doc = this.element.ownerDocument;
    const win = doc.defaultView;
    const onMove = (e: PointerEvent) => this.handlePointerMove(e);
    const onUp = (e: PointerEvent) => this.handlePointerUp(e);
    const onCancel = (e: PointerEvent) => this.handlePointerCancel(e);
    const onWindowBlur = (e: Event) => this.abortActiveStream(e);
    const onVisibilityChange = (e: Event) => {
      if (doc.visibilityState === 'hidden') {
        this.abortActiveStream(e);
      }
    };

    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onCancel);
    doc.addEventListener('visibilitychange', onVisibilityChange);
    win?.addEventListener('blur', onWindowBlur);

    this.unbindDocumentTracking = () => {
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('pointercancel', onCancel);
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      win?.removeEventListener('blur', onWindowBlur);
    };
  }

  private stopDocumentTracking(): void {
    if (this.unbindDocumentTracking) {
      this.unbindDocumentTracking();
      this.unbindDocumentTracking = null;
    }
  }

  private abortActiveStream(triggerEvent: Event): void {
    const cancelEvent = this.stream.cancelAll(triggerEvent);
    if (cancelEvent) {
      this.arena.dispatch(cancelEvent);
    }
    this.releaseAllCapturedPointers();
    this.stopDocumentTracking();
  }

  private captureActivePointers(): void {
    for (const pointerId of this.stream.activePointerIds) {
      if (this.capturedPointers.has(pointerId)) {
        continue;
      }
      try {
        this.element.setPointerCapture?.(pointerId);
        this.capturedPointers.add(pointerId);
      } catch {
        // Synthetic PointerEvents in test environments may not support hardware capture.
      }
    }
  }

  private releaseCapturedPointer(pointerId: number): void {
    if (!this.capturedPointers.delete(pointerId)) {
      return;
    }
    try {
      if (this.element.hasPointerCapture?.(pointerId)) {
        this.element.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore if pointer capture was already released.
    }
  }

  private releaseAllCapturedPointers(): void {
    if (this.capturedPointers.size === 0) {
      return;
    }
    for (const pointerId of Array.from(this.capturedPointers)) {
      this.releaseCapturedPointer(pointerId);
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.isValidPointer(e)) {
      return;
    }
    this.suppressClickUntil = 0;

    const motionEvent = this.stream.onPointerDown(e);
    if (!motionEvent) {
      return;
    }

    this.ensureDocumentTracking();
    this.arena.dispatch(motionEvent);

    if (this.arena.hasActiveGesture) {
      this.captureActivePointers();
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (
      this.stream.activePointerCount === 0 ||
      e === this.lastProcessedEvent ||
      !this.isValidPointer(e)
    ) {
      return;
    }
    this.lastProcessedEvent = e;

    if (!this.arena.hasLiveRecognizers) {
      this.stream.updatePointerSilent(e);
      return;
    }

    const motionEvent = this.stream.onPointerMove(e, this.arena.needsVelocity);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (
      this.stream.activePointerCount === 0 ||
      e === this.lastProcessedEvent ||
      !this.isValidPointer(e)
    ) {
      return;
    }
    this.lastProcessedEvent = e;

    const motionEvent = this.stream.onPointerUp(e);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }

    this.releaseCapturedPointer(e.pointerId);
    if (this.stream.activePointerCount === 0) {
      if (this.arena.didSuppressingGestureWin) {
        this.suppressClickUntil = performance.now() + GHOST_CLICK_WINDOW_MS;
      }
      this.stopDocumentTracking();
    }
  }

  private handlePointerCancel(e: PointerEvent): void {
    if (
      this.stream.activePointerCount === 0 ||
      e === this.lastProcessedEvent ||
      !this.isValidPointer(e)
    ) {
      return;
    }
    this.lastProcessedEvent = e;

    const motionEvent = this.stream.onPointerCancel(e);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }

    this.releaseAllCapturedPointers();
    this.stopDocumentTracking();
  }

  private handleLostPointerCapture(e: PointerEvent): void {
    this.capturedPointers.delete(e.pointerId);
    if (!this.stream.hasPointer(e.pointerId)) {
      return;
    }
    const motionEvent = this.stream.onPointerCancel(e);
    if (motionEvent) {
      this.arena.dispatch(motionEvent);
    }
    this.releaseAllCapturedPointers();
    this.stopDocumentTracking();
  }

  private handleClickCapture(e: MouseEvent): void {
    if (this.suppressClickUntil === 0) {
      return;
    }
    if (performance.now() > this.suppressClickUntil) {
      this.suppressClickUntil = 0;
      return;
    }
    if (e.detail === 0) {
      return;
    }
    this.suppressClickUntil = 0;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
}
