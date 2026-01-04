export interface Point {
  x: number;
  y: number;
}

export interface PointerData extends Point {
  time: number;
}

export class MotionTracker {
  pointers: Map<number, PointerData>;
  centroid: Point;
  lastCentroid: PointerData;

  // Velocity (Pixels per ms)
  velocityX: number;
  velocityY: number;

  // Multi-touch Metrics
  startDistance: number;
  startAngle: number;

  constructor() {
    this.pointers = new Map();
    this.centroid = {x: 0, y: 0};
    this.lastCentroid = {x: 0, y: 0, time: 0};

    this.velocityX = 0;
    this.velocityY = 0;

    this.startDistance = 0;
    this.startAngle = 0;
  }

  addPointer(e: PointerEvent): void {
    this.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      time: e.timeStamp,
    });
    this.updateCentroid();

    // Reset velocity on new touch to prevent "phantom" momentum from previous single-touch gestures
    if (this.pointers.size === 1) {
      this.lastCentroid = {...this.centroid, time: e.timeStamp};
      this.velocityX = 0;
      this.velocityY = 0;
    }

    // Reset pinch/rotate baselines
    if (this.pointers.size === 2) {
      this.startDistance = this.getDistance();
      this.startAngle = this.getAngle();
    }
  }

  removePointer(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.updateCentroid();

    // If pointers drop to 1, reset lastCentroid to avoid large jumps in delta
    if (this.pointers.size > 0) {
      this.lastCentroid = {...this.centroid, time: e.timeStamp};
    }
  }

  update(e: PointerEvent): void {
    if (!this.pointers.has(e.pointerId)) return;

    this.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      time: e.timeStamp,
    });

    this.updateCentroid();
    this.calculateVelocity(e.timeStamp);
  }

  private updateCentroid(): void {
    if (this.pointers.size === 0) return;

    let sumX = 0,
      sumY = 0;
    for (const p of this.pointers.values()) {
      sumX += p.x;
      sumY += p.y;
    }

    this.centroid = {
      x: sumX / this.pointers.size,
      y: sumY / this.pointers.size,
    };
  }

  private calculateVelocity(now: number): void {
    const dt = now - this.lastCentroid.time;

    if (dt > 0) {
      const dx = this.centroid.x - this.lastCentroid.x;
      const dy = this.centroid.y - this.lastCentroid.y;

      const vx = dx / dt;
      const vy = dy / dt;

      // 80/20 Low Pass Filter (Smoothing) because raw velocity is too jittery
      this.velocityX = 0.8 * vx + 0.2 * this.velocityX;
      this.velocityY = 0.8 * vy + 0.2 * this.velocityY;

      this.lastCentroid = {
        x: this.centroid.x,
        y: this.centroid.y,
        time: now,
      };
    }
  }

  private getDistance(): number {
    if (this.pointers.size < 2) return 0;
    const points = Array.from(this.pointers.values());
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(): number {
    if (this.pointers.size < 2) return 0;
    const points = Array.from(this.pointers.values());
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  getScaleFactor(): number {
    if (this.pointers.size < 2 || this.startDistance === 0) return 1;
    return this.getDistance() / this.startDistance;
  }

  getRotationDelta(): number {
    if (this.pointers.size < 2) return 0;
    return this.getAngle() - this.startAngle;
  }
}
