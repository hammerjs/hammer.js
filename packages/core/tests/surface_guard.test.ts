import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SurfaceGuard} from '../src/surface_guard';

describe('SurfaceGuard', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  afterEach(() => {
    element.remove();
    vi.useRealTimers();
  });

  const createGuard = (
    target: HTMLElement,
    overrides: Partial<ConstructorParameters<typeof SurfaceGuard>[0]> = {}
  ) =>
    new SurfaceGuard({
      element: target,
      touchAction: 'compute',
      supportedPointerTypes: ['touch', 'mouse'],
      actions: [],
      hasContinuousRecognizer: false,
      shouldIgnoreEvent: () => false,
      shouldPreventTouchMove: () => false,
      getActivePointerType: () => null,
      onAbortActiveStream: () => {},
      ...overrides,
    });

  it('applies touch-action without blocking selection on discrete-only surfaces, and restores prior inline styles cleanly', () => {
    const passiveGuard = createGuard(element, {
      actions: ['manipulation'],
      hasContinuousRecognizer: false,
    });
    expect(element.style.touchAction).toBe('manipulation');
    expect(element.style.userSelect || '').toBe('');

    const passiveDrag = new Event('dragstart', {cancelable: true});
    const passiveSpy = vi.spyOn(passiveDrag, 'preventDefault');
    element.dispatchEvent(passiveDrag);
    expect(passiveSpy).not.toHaveBeenCalled();
    passiveGuard.destroy();
    expect(element.style.touchAction || '').toBe('');

    element.style.touchAction = 'pan-x';
    element.style.userSelect = 'text';
    const activeGuard = createGuard(element, {
      touchAction: 'pan-y',
      actions: ['pan-y'],
      hasContinuousRecognizer: true,
    });
    expect(element.style.touchAction).toBe('pan-y');
    expect(element.style.userSelect).toBe('none');
    expect((element.style as unknown as Record<string, string>).webkitUserSelect).toBe('none');
    expect((element.style as unknown as Record<string, string>).webkitTouchCallout).toBe('none');

    const activeDrag = new Event('dragstart', {cancelable: true});
    const activeSpy = vi.spyOn(activeDrag, 'preventDefault');
    element.dispatchEvent(activeDrag);
    expect(activeSpy).toHaveBeenCalledTimes(1);

    activeGuard.destroy();
    expect(element.style.touchAction).toBe('pan-x');
    expect(element.style.userSelect).toBe('text');
    expect((element.style as unknown as Record<string, string>).webkitTouchCallout || '').toBe('');

    const postCleanupDrag = new Event('dragstart', {cancelable: true});
    const postSpy = vi.spyOn(postCleanupDrag, 'preventDefault');
    element.dispatchEvent(postCleanupDrag);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('coordinates element/document coexistence guards and cleans up on destroy', () => {
    document.body.appendChild(element);
    let preventScroll = false;
    let activePointerType: string | null = null;
    const onAbort = vi.fn();

    const guard = createGuard(element, {
      actions: ['pan-x pan-y'],
      hasContinuousRecognizer: true,
      shouldPreventTouchMove: () => preventScroll,
      getActivePointerType: () => activePointerType,
      onAbortActiveStream: onAbort,
    });

    expect(element.style.touchAction).toBe('pan-x pan-y');
    expect(element.style.userSelect).toBe('none');

    // 1-finger touchmove is allowed while not owning scroll, prevented once owning scroll:
    const singleMove = new Event('touchmove', {bubbles: true, cancelable: true});
    Object.defineProperty(singleMove, 'touches', {value: [{identifier: 1}]});
    element.dispatchEvent(singleMove);
    expect(singleMove.defaultPrevented).toBe(false);

    preventScroll = true;
    const ownedMove = new Event('touchmove', {bubbles: true, cancelable: true});
    Object.defineProperty(ownedMove, 'touches', {value: [{identifier: 1}]});
    element.dispatchEvent(ownedMove);
    expect(ownedMove.defaultPrevented).toBe(true);

    // Active tracking mirrors pinch guard onto document and aborts mouse drag on contextmenu:
    guard.setActive(true);
    const docPinchMove = new Event('touchmove', {bubbles: true, cancelable: true});
    Object.defineProperty(docPinchMove, 'touches', {value: [{identifier: 1}, {identifier: 2}]});
    document.body.dispatchEvent(docPinchMove);
    expect(docPinchMove.defaultPrevented).toBe(true);

    activePointerType = 'mouse';
    const mouseMenu = new Event('contextmenu', {bubbles: true, cancelable: true});
    Object.defineProperty(mouseMenu, 'pointerType', {value: 'mouse'});
    document.body.dispatchEvent(mouseMenu);
    expect(mouseMenu.defaultPrevented).toBe(false);
    expect(onAbort).toHaveBeenCalledTimes(1);

    activePointerType = 'touch';
    const touchMenu = new Event('contextmenu', {bubbles: true, cancelable: true});
    Object.defineProperty(touchMenu, 'pointerType', {value: 'touch'});
    element.dispatchEvent(touchMenu);
    expect(touchMenu.defaultPrevented).toBe(true);

    guard.destroy();
    expect(element.style.touchAction || '').toBe('');
    expect(element.style.userSelect || '').toBe('');

    const afterDestroyPinch = new Event('touchmove', {bubbles: true, cancelable: true});
    Object.defineProperty(afterDestroyPinch, 'touches', {
      value: [{identifier: 1}, {identifier: 2}],
    });
    document.body.dispatchEvent(afterDestroyPinch);
    expect(afterDestroyPinch.defaultPrevented).toBe(false);
  });

  it('suppresses a single trailing ghost click within timeout and ignores keyboard, unrelated, or expired clicks', () => {
    vi.useFakeTimers();

    const child = document.createElement('button');
    const sibling = document.createElement('button');
    element.append(child, sibling);
    document.body.appendChild(element);

    const childClick = vi.fn();
    const siblingClick = vi.fn();
    child.addEventListener('click', childClick);
    sibling.addEventListener('click', siblingClick);

    const guard = createGuard(child);
    guard.armClickSuppression();

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

    // Timeout expiry (> 400ms) lets clicks through:
    guard.armClickSuppression();
    vi.advanceTimersByTime(450);
    const lateClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(lateClick);
    expect(lateClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(3);

    // Next `pointerdown` disarms suppression immediately:
    guard.armClickSuppression();
    document.dispatchEvent(new Event('pointerdown', {bubbles: true}));
    const afterDownClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(afterDownClick);
    expect(afterDownClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(4);

    // Manual clear cancels suppression before any click arrives:
    guard.armClickSuppression();
    guard.clearClickSuppression();
    const afterClearClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(afterClearClick);
    expect(afterClearClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(5);

    guard.destroy();
    // Arming after destroy is a safe no-op:
    guard.armClickSuppression();
    const afterDestroyClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
    child.dispatchEvent(afterDestroyClick);
    expect(afterDestroyClick.defaultPrevented).toBe(false);
    expect(childClick).toHaveBeenCalledTimes(6);
  });
});
