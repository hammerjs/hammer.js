export type CardinalDirection = 'left' | 'right' | 'up' | 'down';
export type PanDirection = 'horizontal' | 'vertical' | 'both';

function computeCardinalDirection(vx: number, vy: number): CardinalDirection {
  if (Math.abs(vx) >= Math.abs(vy)) {
    return vx >= 0 ? 'right' : 'left';
  }
  return vy >= 0 ? 'down' : 'up';
}

/**
 * Tracks continuous focal-point travel and extrema across a pan stroke to classify
 * release flicks (`onSwipe`) accurately across direction reversals and pointer re-anchors.
 */
export class SwipeTracker {
  private readonly direction: PanDirection;
  private readonly minVelocity: number;
  private readonly minDistance: number;

  private travelX = 0;
  private travelY = 0;
  private minX = 0;
  private maxX = 0;
  private minY = 0;
  private maxY = 0;

  constructor(direction: PanDirection, minVelocity: number, minDistance: number) {
    this.direction = direction;
    this.minVelocity = minVelocity;
    this.minDistance = minDistance;
  }

  record(dx: number, dy: number): void {
    this.travelX += dx;
    this.travelY += dy;
    if (this.travelX < this.minX) this.minX = this.travelX;
    if (this.travelX > this.maxX) this.maxX = this.travelX;
    if (this.travelY < this.minY) this.minY = this.travelY;
    if (this.travelY > this.maxY) this.maxY = this.travelY;
  }

  classify(vx: number, vy: number): CardinalDirection | null {
    const speed = Math.hypot(vx, vy);
    if (speed < this.minVelocity || speed <= 0) {
      return null;
    }

    // Measure continuous focal travel from the stroke's opposing extremum along `(vx, vy)` so
    // pull-out-then-flick-back succeeds, liftoff recoil (`< minDistance`) fails, and
    // multi-pointer re-anchoring jumps neither fabricate nor erase swipe travel.
    const spanX = vx >= 0 ? this.travelX - this.minX : this.maxX - this.travelX;
    const spanY = vy >= 0 ? this.travelY - this.minY : this.maxY - this.travelY;
    const travelInVelocityDir = (spanX * Math.abs(vx) + spanY * Math.abs(vy)) / speed;
    if (travelInVelocityDir < this.minDistance) {
      return null;
    }

    const cardinal = computeCardinalDirection(vx, vy);
    if (
      (this.direction === 'horizontal' && (cardinal === 'up' || cardinal === 'down')) ||
      (this.direction === 'vertical' && (cardinal === 'left' || cardinal === 'right'))
    ) {
      return null;
    }

    return cardinal;
  }

  reset(): void {
    this.travelX = 0;
    this.travelY = 0;
    this.minX = 0;
    this.maxX = 0;
    this.minY = 0;
    this.maxY = 0;
  }
}
