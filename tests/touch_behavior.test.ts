import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {
  allowsPinchZoom,
  applySurfaceBehavior,
  mergeTouchActions,
  resolveSupportedTouchAction,
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

    // Missing `window.CSS` falls back to returning the requested token directly:
    window.CSS = undefined as unknown as typeof CSS;
    expect(resolveSupportedTouchAction('pan-y pinch-zoom')).toBe('pan-y pinch-zoom');
  });

  it('applies touch-action without blocking selection on tap-only surfaces, and enables selection/drag guards when needed', () => {
    // Tap-only (`preventSelectionAndDrag = false`):
    const cleanupPassive = applySurfaceBehavior(element, 'manipulation', false);
    expect(element.style.touchAction).toBe('manipulation');
    expect(element.style.userSelect || '').toBe('');

    const passiveDrag = new Event('dragstart', {cancelable: true});
    const passiveSpy = vi.spyOn(passiveDrag, 'preventDefault');
    element.dispatchEvent(passiveDrag);
    expect(passiveSpy).not.toHaveBeenCalled();
    cleanupPassive();
    expect(element.style.touchAction || '').toBe('');

    // Prior inline style is preserved and restored on cleanup when `preventSelectionAndDrag = true`:
    element.style.touchAction = 'pan-x';
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
    expect(element.style.userSelect || '').toBe('');

    const postCleanupDrag = new Event('dragstart', {cancelable: true});
    const postSpy = vi.spyOn(postCleanupDrag, 'preventDefault');
    element.dispatchEvent(postCleanupDrag);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('supports native CSSStyleDeclaration setProperty/getPropertyValue/removeProperty when touch-action is in the CSS table', () => {
    const customEl = document.createElement('div');
    const styleMap = new Map<string, string>([['touch-action', 'manipulation']]);
    customEl.style.getPropertyValue = (prop: string) => styleMap.get(prop) || '';
    customEl.style.setProperty = (prop: string, value: string) => {
      styleMap.set(prop, value);
    };
    customEl.style.removeProperty = (prop: string) => {
      const prev = styleMap.get(prop) || '';
      styleMap.delete(prop);
      return prev;
    };

    const cleanup = applySurfaceBehavior(customEl, 'none', true);
    expect(customEl.style.getPropertyValue('touch-action')).toBe('none');
    expect(customEl.style.getPropertyValue('user-select')).toBe('none');

    cleanup();
    expect(customEl.style.getPropertyValue('touch-action')).toBe('manipulation');
    expect(customEl.style.getPropertyValue('user-select')).toBe('');
  });
});
