import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {
  allowsPinchZoom,
  applySurfaceBehavior,
  mergeTouchActions,
  resolveSupportedTouchAction,
  SurfaceGuard,
} from '../src/touch_behavior';

describe('TouchBehavior', () => {
  let element: HTMLElement;
  const originalCSS = window.CSS;

  beforeEach(() => {
    element = document.createElement('div');
  });

  afterEach(() => {
    window.CSS = originalCSS;
  });

  it('merges recognizer touch-action intents via capability intersection and checks allowsPinchZoom', () => {
    expect(mergeTouchActions([])).toBe('auto');
    expect(mergeTouchActions(['auto', 'manipulation'])).toBe('manipulation');
    expect(mergeTouchActions(['manipulation', 'pan-y pinch-zoom'])).toBe('pan-y pinch-zoom');
    expect(mergeTouchActions(['pan-y pinch-zoom', 'pan-x pan-y'])).toBe('pan-y');
    expect(mergeTouchActions(['pan-x pinch-zoom', 'pan-x pan-y'])).toBe('pan-x');
    expect(mergeTouchActions(['pan-x pinch-zoom', 'pan-y pinch-zoom'])).toBe('pinch-zoom');
    expect(mergeTouchActions(['pan-x', 'pan-y'])).toBe('none');
    expect(mergeTouchActions(['pinch-zoom', 'pan-x pan-y'])).toBe('none');
    expect(mergeTouchActions(['manipulation', 'none'])).toBe('none');

    expect(allowsPinchZoom('auto')).toBe(true);
    expect(allowsPinchZoom('manipulation')).toBe(true);
    expect(allowsPinchZoom('pan-y pinch-zoom')).toBe(true);
    expect(allowsPinchZoom('pan-x pan-y')).toBe(false);
    expect(allowsPinchZoom('none')).toBe(false);
  });

  it('falls back cleanly when older WebKit CSS.supports rejects pinch-zoom compound tokens', () => {
    window.CSS = {
      supports: (_prop: string, value: string) => !value.includes('pinch-zoom'),
    } as unknown as typeof CSS;

    expect(resolveSupportedTouchAction('pan-y pinch-zoom')).toBe('pan-y');
    expect(resolveSupportedTouchAction('pan-x pinch-zoom')).toBe('pan-x');
    expect(resolveSupportedTouchAction('pinch-zoom')).toBe('none');
    expect(resolveSupportedTouchAction('manipulation')).toBe('manipulation');

    window.CSS = {
      supports: () => true,
    } as unknown as typeof CSS;

    expect(resolveSupportedTouchAction('pan-y pinch-zoom')).toBe('pan-y pinch-zoom');
    expect(resolveSupportedTouchAction('pan-x pinch-zoom')).toBe('pan-x pinch-zoom');
    expect(resolveSupportedTouchAction('pinch-zoom')).toBe('pinch-zoom');

    window.CSS = undefined as unknown as typeof CSS;
    expect(resolveSupportedTouchAction('pan-y pinch-zoom')).toBe('pan-y pinch-zoom');
  });

  it('applies touch-action without blocking selection on tap-only surfaces, and restores prior inline styles cleanly', () => {
    const cleanupPassive = applySurfaceBehavior(element, 'manipulation', false);
    expect(element.style.touchAction).toBe('manipulation');
    expect(element.style.userSelect || '').toBe('');

    const passiveDrag = new Event('dragstart', {cancelable: true});
    const passiveSpy = vi.spyOn(passiveDrag, 'preventDefault');
    element.dispatchEvent(passiveDrag);
    expect(passiveSpy).not.toHaveBeenCalled();
    cleanupPassive();
    expect(element.style.touchAction || '').toBe('');

    element.style.touchAction = 'pan-x';
    element.style.userSelect = 'text';
    const cleanupActive = applySurfaceBehavior(element, 'pan-y', true);
    expect(element.style.touchAction).toBe('pan-y');
    expect(element.style.userSelect).toBe('none');
    expect((element.style as unknown as Record<string, string>).webkitUserSelect).toBe('none');
    expect((element.style as unknown as Record<string, string>).webkitTouchCallout).toBe('none');

    const activeDrag = new Event('dragstart', {cancelable: true});
    const activeSpy = vi.spyOn(activeDrag, 'preventDefault');
    element.dispatchEvent(activeDrag);
    expect(activeSpy).toHaveBeenCalledTimes(1);

    cleanupActive();
    expect(element.style.touchAction).toBe('pan-x');
    expect(element.style.userSelect).toBe('text');
    expect((element.style as unknown as Record<string, string>).webkitTouchCallout || '').toBe('');

    const postCleanupDrag = new Event('dragstart', {cancelable: true});
    const postSpy = vi.spyOn(postCleanupDrag, 'preventDefault');
    element.dispatchEvent(postCleanupDrag);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('SurfaceGuard coordinates element/document coexistence guards and cleans up on destroy', () => {
    document.body.appendChild(element);
    try {
      let preventScroll = false;
      let activePointerType: string | null = null;
      const onAbort = vi.fn();

      const guard = new SurfaceGuard({
        element,
        touchAction: 'compute',
        supportedPointerTypes: ['touch', 'mouse'],
        shouldIgnoreEvent: () => false,
        shouldPreventTouchMove: () => preventScroll,
        getActivePointerType: () => activePointerType,
        onAbortActiveStream: onAbort,
      });

      guard.sync(['pan-x pan-y'], true);
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
    } finally {
      element.remove();
    }
  });
});
