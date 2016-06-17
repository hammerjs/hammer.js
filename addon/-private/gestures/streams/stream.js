import StreamEvent from './stream-event';
import MacroTask from '../utils/macro-task';

export default class Stream {

  constructor() {
    this.segments = null;
    this.series = null;
    this._isDestroyed = false;
    this._isDestroying = false;
    this.active = false;
  }

  open(info) {
    this.active = true;
    this.segments = [];
    this.series = [];

    this.segments.push(this.series);

    let streamEvent = new StreamEvent('start', info);

    this.series.push(streamEvent);
    return streamEvent;
  }

  push(info) {
    // Improve Chrome Performance
    if (this.segments.length > 1 || this.series.length > 2) {
      info.event.cancelable = false;
    }

    let lastEvent = this.series[this.series.length - 1];
    let streamEvent = new StreamEvent('move', info, lastEvent);

    this.series.push(streamEvent);
    return streamEvent;
  }

  close(info) {
    this.active = false;
    let lastEvent = this.series[this.series.length - 1];
    let streamEvent = new StreamEvent('end', info, lastEvent);

    this.series.push(streamEvent);

    this._isDestroying = true;
    new MacroTask(() => { this.destroy(); });

    return streamEvent;
  }

  silence() {
    let [[down, initial]] = this.segments;

    down.silence();
    initial.silence();
  }

  split() {
    this.series = [];
    this.segments.push(this.series);
  }

  destroy() {
    if (!this._isDestroyed) {
      this._isDestroyed = true;
      this.series = undefined;
      for (let i = 0; i < this.segments.length; i++) {
        for (let j = 0; j < this.segments[i].length; j++) {
          this.segments[i][j].destroy();
        }
      }
      this.segments = undefined;
    }
  }

}
