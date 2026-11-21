import {
  NON_PASSIVE,
  supportsGestureEvents,
  toggleListener,
  toggleSafariGestures,
} from './dom_utils.js';

export type GestureTargetElement = HTMLElement | SVGElement;

export type TouchActionValue =
  | 'auto'
  | 'manipulation'
  | 'pan-x'
  | 'pan-y'
  | 'pan-x pan-y'
  | 'pan-x pinch-zoom'
  | 'pan-y pinch-zoom'
  | 'pinch-zoom'
  | 'none';

export type TouchActionSetting = 'compute' | TouchActionValue | false;

// 4-bit capability lattice representing native browser actions allowed by W3C CSS `touch-action`:
const ALLOW_PAN_X = 1 << 0;
const ALLOW_PAN_Y = 1 << 1;
const ALLOW_PINCH_ZOOM = 1 << 2;
const ALLOW_DOUBLE_TAP_ZOOM = 1 << 3;
const ALLOW_ALL = ALLOW_PAN_X | ALLOW_PAN_Y | ALLOW_PINCH_ZOOM | ALLOW_DOUBLE_TAP_ZOOM;

const TOUCH_ACTION_MASKS: Record<TouchActionValue, number> = {
  none: 0,
  'pan-x': ALLOW_PAN_X,
  'pan-y': ALLOW_PAN_Y,
  'pan-x pan-y': ALLOW_PAN_X | ALLOW_PAN_Y,
  'pinch-zoom': ALLOW_PINCH_ZOOM,
  'pan-x pinch-zoom': ALLOW_PAN_X | ALLOW_PINCH_ZOOM,
  'pan-y pinch-zoom': ALLOW_PAN_Y | ALLOW_PINCH_ZOOM,
  manipulation: ALLOW_PAN_X | ALLOW_PAN_Y | ALLOW_PINCH_ZOOM,
  auto: ALLOW_ALL,
};

const MASK_TO_TOUCH_ACTION: readonly TouchActionValue[] = [
  'none',
  'pan-x',
  'pan-y',
  'pan-x pan-y',
  'pinch-zoom',
  'pan-x pinch-zoom',
  'pan-y pinch-zoom',
  'manipulation',
];

/** Returns `true` when `action` permits native 2-finger browser pinch-zoom. */
export function allowsPinchZoom(action: TouchActionValue): boolean {
  return (TOUCH_ACTION_MASKS[action] & ALLOW_PINCH_ZOOM) !== 0;
}

/**
 * Checks whether the current browser CSS parser supports `value` for `touch-action`,
 * falling back cleanly on older WebKit / iOS Safari builds that reject `pinch-zoom`
 * compound tokens (where setting an unsupported token would drop the declaration).
 */
export function resolveSupportedTouchAction(value: TouchActionValue): TouchActionValue {
  if (value !== 'pan-x pinch-zoom' && value !== 'pan-y pinch-zoom' && value !== 'pinch-zoom') {
    return value;
  }
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    return value;
  }
  if (CSS.supports('touch-action', value)) {
    return value;
  }
  return value === 'pan-x pinch-zoom' ? 'pan-x' : value === 'pan-y pinch-zoom' ? 'pan-y' : 'none';
}

/**
 * Combines multiple recognizer `TouchActionValue` intents via intersection (`&`)
 * over the W3C capability lattice so native scrolling and zooming remain enabled
 * on every axis not claimed by a registered recognizer.
 */
export function mergeTouchActions(actions: readonly TouchActionValue[]): TouchActionValue {
  let mask = ALLOW_ALL;
  for (const action of actions) {
    mask &= TOUCH_ACTION_MASKS[action];
  }
  const merged = mask === ALLOW_ALL ? 'auto' : MASK_TO_TOUCH_ACTION[mask & 7];
  return resolveSupportedTouchAction(merged);
}

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

export interface SurfaceGuardOptions {
  readonly element: GestureTargetElement;
  readonly touchAction: TouchActionSetting;
  readonly supportedPointerTypes: readonly string[];
  readonly shouldIgnoreEvent: (e: Event) => boolean;
  readonly shouldPreventTouchMove: () => boolean;
  readonly getActivePointerType: () => string | null;
  readonly onAbortActiveStream: (e: Event) => void;
}

/**
 * Coordinates browser coexistence guards for a gesture target: CSS `touch-action`,
 * selection/`dragstart` prevention, non-passive `touchmove` scroll/pinch guards,
 * touch/pen `contextmenu` suppression, and iOS Safari `gesture*` guards (including
 * document-level mirrors while a pointer stream is active).
 */
export class SurfaceGuard {
  private readonly element: GestureTargetElement;
  private readonly touchAction: TouchActionSetting;
  private readonly supportedPointerTypes: readonly string[];
  private readonly shouldIgnoreEvent: (e: Event) => boolean;
  private readonly shouldPreventTouchMove: () => boolean;
  private readonly getActivePointerType: () => string | null;
  private readonly onAbortActiveStream: (e: Event) => void;

  private savedStyles: SavedSurfaceStyles | null = null;
  private boundNonTapGuards = false;
  private boundTouchMove = false;
  private boundSafariGestures = false;
  private preventsPinchZoom = false;
  private suppressesTouchContextMenu = false;
  private activeTracking = false;
  private activeWin: Window | null = null;
  private activePinchGuard = false;
  private destroyed = false;

  constructor(options: SurfaceGuardOptions) {
    this.element = options.element;
    this.touchAction = options.touchAction;
    this.supportedPointerTypes = options.supportedPointerTypes;
    this.shouldIgnoreEvent = options.shouldIgnoreEvent;
    this.shouldPreventTouchMove = options.shouldPreventTouchMove;
    this.getActivePointerType = options.getActivePointerType;
    this.onAbortActiveStream = options.onAbortActiveStream;
  }

  /** Recomputes CSS `touch-action` and element coexistence listeners for the current recognizers. */
  sync(actions: readonly TouchActionValue[], hasNonTapRecognizer: boolean): void {
    this.clearSurface();
    if (this.destroyed || this.touchAction === false) {
      return;
    }
    if (actions.length === 0 && this.touchAction === 'compute') {
      return;
    }

    const supportsTouch = this.supportedPointerTypes.includes('touch');
    const supportsTouchOrPen = supportsTouch || this.supportedPointerTypes.includes('pen');

    const resolvedAction: TouchActionValue | null =
      this.touchAction === 'compute'
        ? supportsTouchOrPen
          ? mergeTouchActions(actions)
          : null
        : resolveSupportedTouchAction(this.touchAction);

    const preventsPinchZoom =
      supportsTouch &&
      resolvedAction !== null &&
      (!allowsPinchZoom(resolvedAction) || actions.some(a => !allowsPinchZoom(a)));

    this.preventsPinchZoom = preventsPinchZoom;
    this.suppressesTouchContextMenu = hasNonTapRecognizer && supportsTouchOrPen;

    const el = this.element;
    const style = el.style as WebkitStyle;
    const prevTouchAction = resolvedAction !== null ? (style.touchAction ?? '') : null;
    if (resolvedAction !== null) {
      style.touchAction = resolvedAction;
    }

    let prevSelection: SavedSurfaceStyles['selection'] = null;
    if (hasNonTapRecognizer) {
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

    this.boundNonTapGuards = hasNonTapRecognizer;
    this.boundTouchMove =
      supportsTouch && hasNonTapRecognizer && resolvedAction !== null && resolvedAction !== 'none';
    this.boundSafariGestures =
      preventsPinchZoom &&
      actions.length > 0 &&
      supportsGestureEvents(el.ownerDocument.defaultView);
    this.toggleSurfaceListeners(true);
  }

  /** Mirrors `contextmenu` and pinch-zoom guards on `ownerDocument` while a stream is active. */
  setActive(active: boolean): void {
    if (this.activeTracking === active) {
      return;
    }

    const doc = this.element.ownerDocument;
    const win = active ? doc.defaultView : this.activeWin;
    const guardPinch = active ? this.preventsPinchZoom : this.activePinchGuard;

    this.activeTracking = active;
    this.activeWin = active ? win : null;
    this.activePinchGuard = active && guardPinch;

    toggleListener(doc, 'contextmenu', this, active);
    // Straddling pinches whose second finger lands outside `element` dispatch touch/gesture
    // events to other targets, so mirror the pinch-zoom guards on the document while active.
    if (guardPinch) {
      toggleListener(doc, 'touchmove', this, active, NON_PASSIVE);
      if (supportsGestureEvents(win)) {
        toggleSafariGestures(doc, this, active);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.setActive(false);
    this.clearSurface();
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
    }
  }

  private toggleSurfaceListeners(add: boolean): void {
    const el = this.element;
    if (this.boundNonTapGuards) {
      toggleListener(el, 'dragstart', this, add);
      toggleListener(el, 'contextmenu', this, add);
    }
    if (this.boundTouchMove) {
      toggleListener(el, 'touchmove', this, add, NON_PASSIVE);
    }
    if (this.boundSafariGestures) {
      toggleSafariGestures(el, this, add);
    }
  }

  private clearSurface(): void {
    this.toggleSurfaceListeners(false);
    this.boundNonTapGuards = false;
    this.boundTouchMove = false;
    this.boundSafariGestures = false;

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

    this.preventsPinchZoom = false;
    this.suppressesTouchContextMenu = false;
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
   * will swallow) while suppressing touch/pen long-press context menus on non-tap surfaces.
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
}
