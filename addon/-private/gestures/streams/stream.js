import StreamEvent from './stream-event';
import StreamSeries from './stream-series';
import MacroTask from '../utils/macro-task';
import FastArray from 'perf-primitives/fast-array';

const STREAM_POOL = new FastArray(5, 'Stream Pool');

export default class Stream {

  constructor() {
    this.init();
  }

  init() {
    this.segments = new FastArray(5, 'Segments');
    this.series = undefined;
    this._isDestroyed = false;
    this._isDestroying = false;
    this.active = false;
  }

  open(info) {
    this.active = true;
    this.series = StreamSeries.create();
    this.segments.push(this.series);

    let streamEvent = StreamEvent.create('start', info);

    this.series.push(streamEvent);
    return streamEvent;
  }

  push(info) {
    let lastEvent = this.series.get(this.series.length - 1);
    let streamEvent = StreamEvent.create('move', info, lastEvent);

    this.series.push(streamEvent);
    return streamEvent;
  }

  close(info) {
    this.active = false;
    let lastEvent = this.series.get(this.series.length - 1);
    let streamEvent = StreamEvent.create('end', info, lastEvent);

    this.series.push(streamEvent);

    this._isDestroying = true;
    new MacroTask(() => { this.destroy(); });

    return streamEvent;
  }

  silence() {
    let series = this.segments.get(0);
    let down = series.get(0);
    let initial = series.get(1);

    down.silence();
    initial.silence();
  }

  split() {
    this.series = StreamSeries.create();
    this.segments.push(this.series);
  }

  destroy() {
    if (!this._isDestroyed) {
      this._isDestroyed = true;
      this.series = undefined;

      this.segments.forEach((series) => {
        series.destroy();
      });
      this.segments = undefined;

      STREAM_POOL.push(this);
    }
  }

  static create() {
    let stream = STREAM_POOL.pop();

    if (stream) {
      stream.init();
      return stream;
    }

    return new Stream();
  }

}
