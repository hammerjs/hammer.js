import {describe, it, expect, vi, beforeEach} from 'vitest';
import {GestureManager} from '../src/gesture_manager';
import {GestureRecognizer} from '../src/gesture_recognizer';

// Mock Recognizer
class MockRecognizer extends GestureRecognizer {
  onStart = vi.fn();
  onMove = vi.fn();
  onEnd = vi.fn();
}

describe('GestureManager', () => {
  let element: HTMLElement;
  let manager: GestureManager;
  let recognizer: MockRecognizer;

  beforeEach(() => {
    element = document.createElement('div');
    // Manager defaults to touch/pen. We add mouse for easier testing if needed,
    // but here we will simulate touch events.
    manager = new GestureManager(element, {supportedPointerTypes: ['touch', 'mouse']});
    recognizer = new MockRecognizer();
    manager.register(recognizer);
  });

  it('binds events to the element', () => {
    // We can't easily check internal listeners, but we can fire an event
    const event = new PointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1});
    element.dispatchEvent(event);

    expect(recognizer.onStart).toHaveBeenCalled();
  });

  it('ignores unsupported pointer types', () => {
    const event = new PointerEvent('pointerdown', {pointerType: 'mouse'});
    // Re-init manager to only accept touch
    const touchManager = new GestureManager(element, {supportedPointerTypes: ['touch']});
    const touchRecognizer = new MockRecognizer();
    touchManager.register(touchRecognizer);

    element.dispatchEvent(event);
    expect(touchRecognizer.onStart).not.toHaveBeenCalled();
  });

  it('cleans up listeners on destroy', () => {
    manager.destroy();
    const event = new PointerEvent('pointerdown', {pointerType: 'touch'});
    element.dispatchEvent(event);

    expect(recognizer.onStart).not.toHaveBeenCalled();
  });
});
