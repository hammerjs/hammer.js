import {afterEach, describe, expect, it} from 'vitest';
import {allowsPinchZoom, mergeTouchActions, resolveSupportedTouchAction} from '../src/touch_action';

describe('touch_action', () => {
  const originalCSS = window.CSS;

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
});
