const FORM_CONTROL_SELECTOR = 'input,textarea,select,option';

/** Listener options opting out of passive-by-default `touchmove` / WebKit `gesture*` handling. */
export const NON_PASSIVE: AddEventListenerOptions = {passive: false};

/** Returns `true` on WebKit / Safari environments that emit proprietary `gesturestart`/`gesturechange` events. */
export function supportsGestureEvents(win: Window | null): boolean {
  return !!win && 'GestureEvent' in win;
}

interface ListenerBinding {
  readonly target: EventTarget;
  readonly type: string;
  readonly handler: EventListenerOrEventListenerObject;
  readonly options?: AddEventListenerOptions | boolean;
}

/**
 * Scoped DOM listener group with single-call teardown (`clear()`).
 *
 * Provides `AbortController`-style batch removal without bumping browser support
 * past Chrome 60 / Edge 79 / Firefox 59 / Safari 13 (`addEventListener({signal})`
 * requires Chrome 90+ / Firefox 86+ / Safari 15+).
 */
export class ListenerBag {
  private readonly bindings: ListenerBinding[] = [];

  add(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    target.addEventListener(type, handler, options);
    this.bindings.push({target, type, handler, options});
  }

  clear(): void {
    for (let i = this.bindings.length - 1; i >= 0; i--) {
      const {target, type, handler, options} = this.bindings[i];
      target.removeEventListener(type, handler, options);
    }
    this.bindings.length = 0;
  }
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
