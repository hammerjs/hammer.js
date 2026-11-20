import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  armClickSuppression,
  isEditableOrFormControl,
  supportsGestureEvents,
  toggleListener,
  toggleSafariGestures,
} from '../src/dom_utils';

describe('dom_utils', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
  });

  it('detects WebKit GestureEvent support safely', () => {
    expect(supportsGestureEvents(null)).toBe(false);
    expect(supportsGestureEvents({} as Window)).toBe(false);
    expect(supportsGestureEvents({GestureEvent: function () {}} as unknown as Window)).toBe(true);
  });

  it('adds and removes listeners via toggleListener and toggleSafariGestures', () => {
    const handler = vi.fn();
    toggleListener(root, 'custom', handler, true);
    root.dispatchEvent(new Event('custom'));
    expect(handler).toHaveBeenCalledTimes(1);

    toggleListener(root, 'custom', handler, false);
    root.dispatchEvent(new Event('custom'));
    expect(handler).toHaveBeenCalledTimes(1);

    const gestureHandler = vi.fn();
    toggleSafariGestures(root, gestureHandler, true);
    root.dispatchEvent(new Event('gesturestart'));
    root.dispatchEvent(new Event('gesturechange'));
    expect(gestureHandler).toHaveBeenCalledTimes(2);

    toggleSafariGestures(root, gestureHandler, false);
    root.dispatchEvent(new Event('gesturestart'));
    root.dispatchEvent(new Event('gesturechange'));
    expect(gestureHandler).toHaveBeenCalledTimes(2);
  });

  it('classifies form controls, contenteditable regions, Shadow DOM targets, and boundary containment', () => {
    const outerEditable = document.createElement('div');
    outerEditable.setAttribute('contenteditable', 'true');
    const card = document.createElement('div');

    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const option = document.createElement('option');
    select.appendChild(option);

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', '');
    const textNode = document.createTextNode('hello');
    editable.appendChild(textNode);

    const nestedOptOut = document.createElement('div');
    nestedOptOut.setAttribute('contenteditable', 'FALSE');
    const nestedBtn = document.createElement('button');
    nestedOptOut.appendChild(nestedBtn);
    editable.appendChild(nestedOptOut);

    const plain = document.createElement('span');

    const shadowHost = document.createElement('div');
    const shadow = shadowHost.attachShadow({mode: 'open'});
    const shadowInput = document.createElement('input');
    shadow.appendChild(shadowInput);

    card.append(input, textarea, select, editable, plain, shadowHost);
    outerEditable.appendChild(card);
    root.appendChild(outerEditable);

    // Non-node EventTargets return false:
    expect(isEditableOrFormControl(window, card)).toBe(false);
    expect(isEditableOrFormControl(new EventTarget(), card)).toBe(false);

    // Native form controls & text nodes inside editable elements inside `card`:
    expect(isEditableOrFormControl(input, card)).toBe(true);
    expect(isEditableOrFormControl(textarea, card)).toBe(true);
    expect(isEditableOrFormControl(select, card)).toBe(true);
    expect(isEditableOrFormControl(option, card)).toBe(true);
    expect(isEditableOrFormControl(textNode, card)).toBe(true);

    // Nested `contenteditable="FALSE"` inside editable region opts back out:
    expect(isEditableOrFormControl(nestedBtn, card)).toBe(false);

    // Outer `contenteditable` ancestor outside `card` does not apply when bounded by `card`:
    expect(isEditableOrFormControl(plain, card, [plain, card, outerEditable, root])).toBe(false);
    // Without a boundary (`null`), the outer `contenteditable` ancestor DOES match:
    expect(isEditableOrFormControl(plain, null)).toBe(true);

    // Shadow DOM input inside `card`: false without composedPath, true with composedPath:
    expect(isEditableOrFormControl(shadowInput, card)).toBe(false);
    expect(
      isEditableOrFormControl(shadowInput, card, [shadowInput, shadow, shadowHost, card, root])
    ).toBe(true);
  });

  it('suppresses a single trailing ghost click within timeout and ignores keyboard, unrelated, or expired clicks', () => {
    vi.useFakeTimers();

    const child = document.createElement('button');
    const sibling = document.createElement('button');
    root.append(child, sibling);

    const childClick = vi.fn();
    const siblingClick = vi.fn();
    child.addEventListener('click', childClick);
    sibling.addEventListener('click', siblingClick);

    const disarm = armClickSuppression(child);

    // Programmatic/keyboard click (`detail === 0`) is NOT suppressed:
    const keyboardClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 0});
    child.dispatchEvent(keyboardClick);
    expect(keyboardClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(1);

    // Unrelated sibling click is NOT suppressed:
    const otherClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    sibling.dispatchEvent(otherClick);
    expect(otherClick.defaultPrevented).toBe(false);
    expect(siblingClick).toHaveBeenCalledTimes(1);

    // Trailing synthetic click (`detail === 1`) on target IS suppressed once, then auto-disarms:
    const ghostClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(ghostClick);
    expect(ghostClick.defaultPrevented).toBe(true);
    expect(childClick).toHaveBeenCalledTimes(1);

    const followUpClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(followUpClick);
    expect(followUpClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(2);

    // Idempotent disarm after auto-disarm:
    disarm();

    // Timeout expiry (> 400ms) lets clicks through:
    armClickSuppression(child);
    vi.advanceTimersByTime(450);
    const lateClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(lateClick);
    expect(lateClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(3);

    // Next `pointerdown` disarms suppression immediately:
    armClickSuppression(child);
    document.dispatchEvent(new Event('pointerdown', {bubbles: true}));
    const afterDownClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(afterDownClick);
    expect(afterDownClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(4);

    // Manual disarm cancels suppression before any click arrives:
    const manualDisarm = armClickSuppression(child);
    manualDisarm();
    const afterDisarmClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(afterDisarmClick);
    expect(afterDisarmClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(5);
  });
});
