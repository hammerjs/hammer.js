import {ListenerBag, NON_PASSIVE, supportsGestureEvents} from './dom_utils.js';
import {
  allowsPinchZoom,
  type GestureTargetElement,
  mergeTouchActions,
  resolveSupportedTouchAction,
  type TouchActionSetting,
  type TouchActionValue,
} from './touch_action.js';

const GHOST_CLICK_TIMEOUT_MS = 400;

type WebkitStyle = CSSStyleDeclaration & {
  webkitUserSelect?: string;
  webkitTouchCallout?: string;
};

interface SavedSurfaceStyles {
  readonly touchAction: string | null;
  readonly selection: {
    readonly userSelect: string;
    readonly webkitUserSelect: string;
    readonly webkitTouchCallout: string;
  } | null;
}

function isRelatedClickTarget(event: Event, element: Element): boolean {
  if (event.composedPath().includes(element)) {
    return true;
  }
  return (
    event.target instanceof Node &&
    (element.contains(event.target) || event.target.contains(element))
  );
}

export interface SurfaceGuardOptions {
  readonly element: GestureTargetElement;
  readonly touchAction: TouchActionSetting;
  readonly supportedPointerTypes: readonly string[];
  readonly actions: readonly TouchActionValue[];
  readonly hasContinuousRecognizer: boolean;
  readonly shouldIgnoreEvent: (e: Event) => boolean;
  readonly shouldPreventTouchMove: () => boolean;
  readonly getActivePointerType: () => string | null;
  readonly onAbortActiveStream: (e: Event) => void;
}

/**
 * Coordinates browser coexistence guards for a gesture target: CSS `touch-action`,
 * selection/`dragstart` prevention, non-passive `touchmove` scroll/pinch guards,
 * touch/pen `contextmenu` suppression, iOS Safari `gesture*` guards (including
 * document-level mirrors while a stream is active), and trailing ghost-click suppression.
 */
export class SurfaceGuard {
  private readonly element: GestureTargetElement;
  private readonly supportedPointerTypes: readonly string[];
  private readonly shouldIgnoreEvent: (e: Event) => boolean;
  private readonly shouldPreventTouchMove: () => boolean;
  private readonly getActivePointerType: () => string | null;
  private readonly onAbortActiveStream: (e: Event) => void;

  private readonly surfaceListeners = new ListenerBag();
  private readonly activeListeners = new ListenerBag();
  private readonly clickListeners = new ListenerBag();

  private savedStyles: SavedSurfaceStyles | null = null;
  private readonly preventsPinchZoom: boolean;
  private readonly suppressesTouchContextMenu: boolean;
  private activeTracking = false;
  private suppressClickUntil = 0;
  private destroyed = false;

  constructor(options: SurfaceGuardOptions) {
    this.element = options.element;
    this.supportedPointerTypes = options.supportedPointerTypes;
    this.shouldIgnoreEvent = options.shouldIgnoreEvent;
    this.shouldPreventTouchMove = options.shouldPreventTouchMove;
    this.getActivePointerType = options.getActivePointerType;
    this.onAbortActiveStream = options.onAbortActiveStream;

    const {touchAction, actions, hasContinuousRecognizer} = options;
    if (touchAction === false || (actions.length === 0 && touchAction === 'compute')) {
      this.preventsPinchZoom = false;
      this.suppressesTouchContextMenu = false;
      return;
    }

    const supportsTouch = this.supportedPointerTypes.includes('touch');
    const supportsTouchOrPen = supportsTouch || this.supportedPointerTypes.includes('pen');

    const resolvedAction: TouchActionValue | null =
      touchAction === 'compute'
        ? supportsTouchOrPen
          ? mergeTouchActions(actions)
          : null
        : resolveSupportedTouchAction(touchAction);

    const preventsPinchZoom =
      supportsTouch &&
      resolvedAction !== null &&
      (!allowsPinchZoom(resolvedAction) || actions.some(a => !allowsPinchZoom(a)));

    this.preventsPinchZoom = preventsPinchZoom;
    this.suppressesTouchContextMenu = hasContinuousRecognizer && supportsTouchOrPen;

    const el = this.element;
    const style = el.style as WebkitStyle;
    const prevTouchAction = resolvedAction !== null ? (style.touchAction ?? '') : null;
    if (resolvedAction !== null) {
      style.touchAction = resolvedAction;
    }

    let prevSelection: SavedSurfaceStyles['selection'] = null;
    if (hasContinuousRecognizer) {
      prevSelection = {
        userSelect: style.userSelect ?? '',
        webkitUserSelect: style.webkitUserSelect ?? '',
        webkitTouchCallout: style.webkitTouchCallout ?? '',
      };
      style.webkitUserSelect = 'none';
      style.userSelect = 'none';
      style.webkitTouchCallout = 'none';
    }
    this.savedStyles = {touchAction: prevTouchAction, selection: prevSelection};

    if (hasContinuousRecognizer) {
      this.surfaceListeners.add(el, 'dragstart', this);
      this.surfaceListeners.add(el, 'contextmenu', this);
    }
    if (
      supportsTouch &&
      hasContinuousRecognizer &&
      resolvedAction !== null &&
      resolvedAction !== 'none'
    ) {
      this.surfaceListeners.add(el, 'touchmove', this, NON_PASSIVE);
    }
    if (
      preventsPinchZoom &&
      actions.length > 0 &&
      supportsGestureEvents(el.ownerDocument.defaultView)
    ) {
      this.surfaceListeners.add(el, 'gesturestart', this, NON_PASSIVE);
      this.surfaceListeners.add(el, 'gesturechange', this, NON_PASSIVE);
    }
  }

  /** Mirrors `contextmenu` and pinch-zoom guards on `ownerDocument` while a stream is active. */
  setActive(active: boolean): void {
    if (this.activeTracking === active) {
      return;
    }
    this.activeTracking = active;
    this.activeListeners.clear();
    if (!active) {
      return;
    }

    const doc = this.element.ownerDocument;
    this.activeListeners.add(doc, 'contextmenu', this);
    // Straddling pinches whose second finger lands outside `element` dispatch touch/gesture
    // events to other targets, so mirror the pinch-zoom guards on the document while active.
    if (this.preventsPinchZoom) {
      this.activeListeners.add(doc, 'touchmove', this, NON_PASSIVE);
      if (supportsGestureEvents(doc.defaultView)) {
        this.activeListeners.add(doc, 'gesturestart', this, NON_PASSIVE);
        this.activeListeners.add(doc, 'gesturechange', this, NON_PASSIVE);
      }
    }
  }

  /**
   * Suppresses a single trailing synthetic DOM `click` on `element` within `GHOST_CLICK_TIMEOUT_MS`
   * after a click-suppressing gesture completes, auto-disarming on match, expiry, or next press.
   */
  armClickSuppression(): void {
    this.clearClickSuppression();
    if (this.destroyed) {
      return;
    }
    const doc = this.element.ownerDocument;
    this.suppressClickUntil = performance.now() + GHOST_CLICK_TIMEOUT_MS;
    this.clickListeners.add(doc, 'pointerdown', this, true);
    this.clickListeners.add(doc, 'click', this, true);
  }

  clearClickSuppression(): void {
    this.suppressClickUntil = 0;
    this.clickListeners.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearClickSuppression();
    this.setActive(false);
    this.surfaceListeners.clear();

    if (this.savedStyles) {
      const style = this.element.style as WebkitStyle;
      if (this.savedStyles.selection) {
        style.webkitTouchCallout = this.savedStyles.selection.webkitTouchCallout;
        style.userSelect = this.savedStyles.selection.userSelect;
        style.webkitUserSelect = this.savedStyles.selection.webkitUserSelect;
      }
      if (this.savedStyles.touchAction !== null) {
        style.touchAction = this.savedStyles.touchAction;
      }
      this.savedStyles = null;
    }
  }

  /** @internal */
  handleEvent(ev: Event): void {
    switch (ev.type) {
      case 'touchmove':
        this.onTouchMove(ev as TouchEvent);
        break;
      case 'gesturestart':
      case 'gesturechange':
        // WebKit `gesturestart` / `gesturechange` guard: iOS Safari ignores `touch-action: pan-x pan-y`
        // for two-finger viewport zoom unless these proprietary events are prevented.
        if (ev.cancelable) {
          ev.preventDefault();
        }
        break;
      case 'contextmenu':
        this.onContextMenu(ev);
        break;
      case 'dragstart':
        if (!this.shouldIgnoreEvent(ev)) {
          ev.preventDefault();
        }
        break;
      case 'pointerdown':
        this.clearClickSuppression();
        break;
      case 'click':
        this.onClickCapture(ev as MouseEvent);
        break;
    }
  }

  /**
   * Non-passive `touchmove` guard. Prevents native pinch-zoom when a recognizer claims it, and
   * native scrolling while a gesture owns the stream. Scroll ownership only applies to touches
   * that started on `element` (touch events always target their `touchstart` element).
   */
  private onTouchMove(e: TouchEvent): void {
    if (!e.cancelable) {
      return;
    }
    const isGuardedPinch = this.preventsPinchZoom && !!e.touches && e.touches.length >= 2;
    const ownsScroll = e.currentTarget === this.element && this.shouldPreventTouchMove();
    if (isGuardedPinch || ownsScroll) {
      e.preventDefault();
    }
  }

  /**
   * Keeps desktop mouse context menus native (aborting a mouse drag whose `pointerup` the menu
   * will swallow) while suppressing touch/pen long-press context menus on continuous surfaces.
   */
  private onContextMenu(e: Event): void {
    const pointerType = (e as Partial<PointerEvent>).pointerType;
    const activeType = this.getActivePointerType();
    if (pointerType === 'mouse' || activeType === 'mouse') {
      if (activeType !== null) {
        this.onAbortActiveStream(e);
      }
      return;
    }
    const isSupportedNonMouse =
      (pointerType === 'touch' || pointerType === 'pen') &&
      this.supportedPointerTypes.includes(pointerType);
    if (this.suppressesTouchContextMenu && (activeType !== null || isSupportedNonMouse)) {
      e.preventDefault();
    }
  }

  private onClickCapture(e: MouseEvent): void {
    if (performance.now() > this.suppressClickUntil) {
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
  }
}
