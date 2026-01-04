import {describe, it, expect, beforeEach, vi} from 'vitest';
import {setTouchBehavior} from '../src/touch_behavior';

describe('TouchBehavior', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');

    // Mock style property manipulation. Touch-action isn't supported in jsdom for some reason?
    const styleMap = new Map<string, string>();
    element.style.getPropertyValue = (prop: string) => {
      return styleMap.get(prop) || '';
    };
    element.style.setProperty = (prop: string, value: string) => {
      styleMap.set(prop, value);
    };
    element.style.removeProperty = (prop: string) => {
      const value = element.style.getPropertyValue(prop);
      styleMap.delete(prop);
      return value;
    };
  });

  describe('touch-action (Scrolling & Zoom)', () => {
    it('sets touch-action to "auto" when no prevention is set', () => {
      setTouchBehavior(element, {
        preventScrollX: false,
        preventScrollY: false,
        preventZoom: false,
      });
      expect(element.style.getPropertyValue('touch-action')).toBe('auto');
    });

    it('sets touch-action to "manipulation" when zoom is prevented', () => {
      setTouchBehavior(element, {
        preventScrollX: false,
        preventScrollY: false,
        preventZoom: true,
      });
      expect(element.style.getPropertyValue('touch-action')).toBe('manipulation');
    });

    it('sets touch-action to "none" when both X and Y scrolling are prevented', () => {
      setTouchBehavior(element, {
        preventScrollX: true,
        preventScrollY: true,
      });
      expect(element.style.getPropertyValue('touch-action')).toBe('none');
    });

    it('sets touch-action to "pan-y" when only X scrolling is prevented', () => {
      setTouchBehavior(element, {
        preventScrollX: true,
        preventScrollY: false,
      });
      expect(element.style.getPropertyValue('touch-action')).toBe('pan-y');
    });

    it('sets touch-action to "pan-x" when only Y scrolling is prevented', () => {
      setTouchBehavior(element, {
        preventScrollX: false,
        preventScrollY: true,
      });
      expect(element.style.getPropertyValue('touch-action')).toBe('pan-x');
    });
  });

  describe('user-select', () => {
    it('sets user-select to "none" when selection is prevented', () => {
      setTouchBehavior(element, {preventSelect: true});

      expect(element.style.userSelect).toBe('none');
      expect(element.style.getPropertyValue('-webkit-user-select')).toBeDefined();
    });

    it('does not set user-select to "none" when selection is not prevented', () => {
      setTouchBehavior(element, {preventSelect: false});
      // Should be empty string (default)
      expect(element.style.userSelect).toBe('');
    });
  });

  describe('contextmenu', () => {
    it('prevents context menu event when prevented', () => {
      setTouchBehavior(element, {preventContextMenu: true});

      const event = new MouseEvent('contextmenu', {cancelable: true});
      const spy = vi.spyOn(event, 'preventDefault');

      element.dispatchEvent(event);

      expect(spy).toHaveBeenCalled();
    });

    it('allows context menu event when not prevented', () => {
      setTouchBehavior(element, {preventContextMenu: false});

      const event = new MouseEvent('contextmenu', {cancelable: true});
      const spy = vi.spyOn(event, 'preventDefault');

      element.dispatchEvent(event);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes styles and event listeners when cleanup function is called', () => {
      // Apply restrictive settings
      const cleanup = setTouchBehavior(element, {
        preventScrollX: true,
        preventScrollY: true,
        preventSelect: true,
        preventContextMenu: true,
      });

      // Verify settings applied
      expect(element.style.getPropertyValue('touch-action')).toBe('none');
      expect(element.style.userSelect).toBe('none');

      // Call cleanup
      cleanup();

      // Verify styles removed
      expect(element.style.getPropertyValue('touch-action')).toBe('');
      expect(element.style.userSelect).toBe('');

      // Verify listener removed (context menu should no longer be prevented)
      const event = new MouseEvent('contextmenu', {cancelable: true});
      const spy = vi.spyOn(event, 'preventDefault');
      element.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
