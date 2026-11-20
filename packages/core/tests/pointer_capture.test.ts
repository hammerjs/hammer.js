import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PointerCapture} from '../src/pointer_capture';

describe('PointerCapture', () => {
  let element: HTMLDivElement;
  let capturedInDom: Set<number>;
  let setSpy: ReturnType<typeof vi.fn>;
  let releaseSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    element = document.createElement('div');
    capturedInDom = new Set();
    setSpy = vi.fn((id: number) => {
      capturedInDom.add(id);
    });
    releaseSpy = vi.fn((id: number) => {
      capturedInDom.delete(id);
    });
    element.setPointerCapture = setSpy;
    element.hasPointerCapture = vi.fn((id: number) => capturedInDom.has(id));
    element.releasePointerCapture = releaseSpy;
  });

  it('captures pointers once, tracks hasCaptures, and releases individually or all at once', () => {
    const pc = new PointerCapture(element);
    expect(pc.hasCaptures).toBe(false);

    pc.capture([1, 2]);
    expect(pc.hasCaptures).toBe(true);
    expect(setSpy).toHaveBeenCalledTimes(2);

    // Capturing already-captured pointers is idempotent:
    pc.capture([1, 2, 3]);
    expect(setSpy).toHaveBeenCalledTimes(3);
    expect(setSpy).toHaveBeenLastCalledWith(3);

    // Releasing an untracked pointer is a no-op:
    pc.release(99);
    expect(releaseSpy).not.toHaveBeenCalled();

    // Releasing a tracked pointer calls releasePointerCapture once:
    pc.release(1);
    pc.release(1);
    expect(releaseSpy).toHaveBeenCalledTimes(1);
    expect(releaseSpy).toHaveBeenCalledWith(1);
    expect(pc.hasCaptures).toBe(true);

    // releaseAll releases remaining tracked pointers:
    pc.releaseAll();
    expect(releaseSpy).toHaveBeenCalledTimes(3);
    expect(pc.hasCaptures).toBe(false);
  });

  it('consumes lostpointercapture only for owned captures', () => {
    const pc = new PointerCapture(element);
    pc.capture([10]);

    expect(pc.consumeLost(99)).toBe(false);
    expect(pc.consumeLost(10)).toBe(true);
    expect(pc.hasCaptures).toBe(false);
    // Consuming a second time returns false:
    expect(pc.consumeLost(10)).toBe(false);
  });

  it('handles DOM exceptions on capture and release gracefully', () => {
    element.setPointerCapture = vi.fn((id: number) => {
      if (id === 1) {
        throw new Error('NotFoundError');
      }
      capturedInDom.add(id);
    });
    element.releasePointerCapture = vi.fn(() => {
      throw new Error('InvalidStateError');
    });

    const pc = new PointerCapture(element);
    pc.capture([1, 2]);

    // Failed capture (1) is not recorded; succeeded capture (2) is:
    expect(pc.consumeLost(1)).toBe(false);
    expect(pc.hasCaptures).toBe(true);

    // Swallows errors thrown by releasePointerCapture and still clears tracking:
    expect(() => pc.release(2)).not.toThrow();
    expect(pc.hasCaptures).toBe(false);
  });
});
