const GHOST_CLICK_TIMEOUT_MS = 400;
const FORM_CONTROL_SELECTOR = 'input,textarea,select,option';

/** Listener options opting out of passive-by-default `touchmove` / WebKit `gesture*` handling. */
export const NON_PASSIVE: AddEventListenerOptions = {passive: false};

/** Returns `true` on WebKit / Safari environments that emit proprietary `gesturestart`/`gesturechange` events. */
export function supportsGestureEvents(win: Window | null): boolean {
  return !!win && 'GestureEvent' in win;
}

/** Attaches (`add: true`) or detaches (`add: false`) a DOM event listener with matching options. */
export function toggleListener(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  add: boolean,
  options?: AddEventListenerOptions | boolean
): void {
  if (add) {
    target.addEventListener(type, handler, options);
  } else {
    target.removeEventListener(type, handler, options);
  }
}

/** Attaches or detaches non-passive WebKit `gesturestart` and `gesturechange` guards on `target`. */
export function toggleSafariGestures(
  target: EventTarget,
  handler: EventListenerOrEventListenerObject,
  add: boolean
): void {
  toggleListener(target, 'gesturestart', handler, add, NON_PASSIVE);
  toggleListener(target, 'gesturechange', handler, add, NON_PASSIVE);
}

/**
 * Returns `true` if `event` targeted `element` or a descendant/ancestor sharing its click path,
 * using `composedPath()` when available so targets inside Shadow DOM still match.
 */
function isRelatedClickTarget(event: Event, element: Element): boolean {
  if (event.composedPath().includes(element)) {
    return true;
  }
  return (
    event.target instanceof Node &&
    (element.contains(event.target) || event.target.contains(element))
  );
}

/**
 * Returns `true` when `node` is equal to or nested inside `boundary`, including across open
 * Shadow DOM boundaries.
 *
 * `Node.prototype.contains()` stops at ShadowRoot boundaries, so when a matched element lives
 * inside a child web component's shadow tree we fall back to `composedPath()`: the event path
 * runs from innermost target outward (`[target, ..., node, ..., shadowHost, ..., boundary, ...]`),
 * so `node` is inside `boundary` iff both appear in the path and `node` precedes or equals `boundary`.
 */
function isWithinBoundary(
  node: Element,
  boundary: Element,
  composedPath?: readonly EventTarget[]
): boolean {
  if (boundary.contains(node)) {
    return true;
  }
  if (!composedPath) {
    return false;
  }
  const nodeIndex = composedPath.indexOf(node);
  const boundaryIndex = composedPath.indexOf(boundary);
  return nodeIndex !== -1 && boundaryIndex !== -1 && nodeIndex <= boundaryIndex;
}

/**
 * Returns `true` when `target` is inside a native form control (`input`, `textarea`, `select`,
 * `option`) or an active `[contenteditable]` region (respecting nested `contenteditable="false"`).
 *
 * When `boundary` is provided, matches outside `boundary` (e.g. an outer `[contenteditable]`
 * ancestor wrapping a gesture widget) are ignored; pass `null` to check anywhere in the document.
 */
export function isEditableOrFormControl(
  target: EventTarget,
  boundary: Element | null,
  composedPath?: readonly EventTarget[]
): boolean {
  const el =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (!el) {
    return false;
  }
  const formControl = el.closest(FORM_CONTROL_SELECTOR);
  if (formControl && (!boundary || isWithinBoundary(formControl, boundary, composedPath))) {
    return true;
  }
  const editable = el.closest('[contenteditable]');
  if (!editable || editable.getAttribute('contenteditable')?.toLowerCase() === 'false') {
    return false;
  }
  return !boundary || isWithinBoundary(editable, boundary, composedPath);
}

/**
 * Suppresses a single trailing synthetic DOM `click` on `element` within `GHOST_CLICK_TIMEOUT_MS`
 * after a continuous gesture finishes, returning an idempotent cleanup function to disarm early.
 */
export function armClickSuppression(element: Element): () => void {
  const doc = element.ownerDocument;
  const suppressUntil = performance.now() + GHOST_CLICK_TIMEOUT_MS;
  let active = true;

  const disarm = (): void => {
    if (!active) {
      return;
    }
    active = false;
    toggleListener(doc, 'click', onClickCapture, false, true);
    toggleListener(doc, 'pointerdown', disarm, false, true);
  };

  const onClickCapture = (e: Event): void => {
    if (performance.now() > suppressUntil) {
      disarm();
      return;
    }
    // `detail === 0` marks programmatic / keyboard-activated clicks, which are never ghosts.
    if ((e as MouseEvent).detail === 0 || !isRelatedClickTarget(e, element)) {
      return;
    }
    disarm();
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  toggleListener(doc, 'pointerdown', disarm, true, true);
  toggleListener(doc, 'click', onClickCapture, true, true);
  return disarm;
}
