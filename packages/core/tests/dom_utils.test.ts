import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  isEditableOrFormControl,
  ListenerBag,
  NON_PASSIVE,
  supportsGestureEvents,
} from '../src/dom_utils';

describe('dom_utils', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('detects WebKit GestureEvent support safely', () => {
    expect(supportsGestureEvents(null)).toBe(false);
    expect(supportsGestureEvents({} as Window)).toBe(false);
    expect(supportsGestureEvents({GestureEvent: function () {}} as unknown as Window)).toBe(true);
  });

  it('attaches and batch-removes scoped DOM listeners via ListenerBag', () => {
    const bag = new ListenerBag();
    const customHandler = vi.fn();
    const objectHandler = {handleEvent: vi.fn()};

    bag.add(root, 'custom', customHandler);
    bag.add(root, 'touchmove', objectHandler, NON_PASSIVE);
    bag.add(document, 'click', objectHandler, true);

    root.dispatchEvent(new Event('custom'));
    root.dispatchEvent(new Event('touchmove'));
    root.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(objectHandler.handleEvent).toHaveBeenCalledTimes(2);

    bag.clear();
    // Idempotent second clear:
    bag.clear();

    root.dispatchEvent(new Event('custom'));
    root.dispatchEvent(new Event('touchmove'));
    root.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(objectHandler.handleEvent).toHaveBeenCalledTimes(2);
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
});
