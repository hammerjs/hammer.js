/**
 * Tracks explicit pointer captures acquired by a `GestureManager` on its target element so
 * releases are idempotent and `lostpointercapture` only aborts pointers we actually captured.
 */
export class PointerCapture {
  private readonly element: Element;
  private readonly captured = new Set<number>();

  constructor(element: Element) {
    this.element = element;
  }

  get hasCaptures(): boolean {
    return this.captured.size > 0;
  }

  capture(pointerIds: Iterable<number>): void {
    for (const pointerId of pointerIds) {
      if (this.captured.has(pointerId)) {
        continue;
      }
      try {
        this.element.setPointerCapture(pointerId);
        this.captured.add(pointerId);
      } catch {
        // `NotFoundError` if the pointer is no longer active (e.g. lifted between events).
      }
    }
  }

  release(pointerId: number): void {
    if (!this.captured.delete(pointerId)) {
      return;
    }
    try {
      if (this.element.hasPointerCapture(pointerId)) {
        this.element.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore if pointer capture was already released.
    }
  }

  releaseAll(): void {
    for (const pointerId of this.captured) {
      this.release(pointerId);
    }
  }

  /** Removes `pointerId` on `lostpointercapture`, returning `true` if we owned the capture. */
  consumeLost(pointerId: number): boolean {
    return this.captured.delete(pointerId);
  }
}
