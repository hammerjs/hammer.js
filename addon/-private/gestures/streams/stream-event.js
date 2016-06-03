/* global Math, performance */

export default class StreamEvent {

  constructor(name, info, prev) {
    this.name = name;
    this.element = info.event.target;
    this.source = info.event;
    this.silenced = false;
    this.prev = prev;

    // time
    this.time = performance.now();
    this.dT = prev ? this.time - prev.time : 0;

    // current position (clientX/Y)
    this.x = info.x;
    this.y = info.y;

    // deltas off of origin event
    this.totalX = info.x - info.originX;
    this.totalY = info.y - info.originY;

    // deltas off of last event
    this.dX = prev ? info.x - prev.x : 0;
    this.dY = prev ? info.y - prev.y : 0;

    // prediction values
    this.acceleration = 0;
    this.aX = 0;
    this.aY = 0;

    this.velocity = 0;
    this.vX = 0;
    this.vY = 0;

    this.nextX = 0;
    this.nextY = 0;
  }

  getAcceleration() {
    const { dT, prev } = this;
    const { vX, vY } = this.getVelocity();
    const { vX: _vX, vY: _vY } = prev;

    // acceleration
    let aX = this.aX = (vX - _vX) / dT;
    let aY = this.aY = (vY - _vY) / dT;
    let acceleration = this.acceleration = Math.sqrt(aX * aX + aY * aY);

    return { aX, aY, acceleration };
  }

  getVelocity() {
    const { dX, dY, dT } = this;

    let vX = this.vX = dX / dT;
    let vY = this.vY = dY / dT;
    let velocity = this.velocity = Math.sqrt(vX * vX + vY * vY);

    return { vX, vY, velocity };
  }

  predict() {
    const { aX, aY } = this.getAcceleration();
    const { x, y, vX, vY, dT } = this;

    // distance = initial distance + velocity * time + 1/2 acceleration * time^2
    let nextX = this.nextX = x + (vX * dT) + (.5 * aX * dT * dT);
    let nextY = this.nextY = y + (vY * dT) + (.5 * aY * dT * dT);

    return { x: nextX, y: nextY };
  }

  // cancel any default behaviors from this event
  silence() {
    this.source.preventDefault();
    this.source.stopPropagation();
    this.silenced = true;
  }

}
