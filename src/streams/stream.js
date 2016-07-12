import StreamEvent from './stream-event';
import StreamSeries from './stream-series';
import MacroTask from '../utils/macro-task';
import FastArray from 'perf-primitives/addon/fast-array';

const STREAM_POOL = new FastArray(5, 'Stream Pool');

export default class Stream {

  constructor(values) {
    this.init(values);
  }

  init({ pointerId, originX, originY }) {
    this.segments = new FastArray(5, 'Segments');
    this.series = undefined;
    this._isDestroyed = false;
    this._isDestroying = false;
    this.active = false;
    this.pointerId = pointerId;
    this.originX = originX;
    this.originY = originY;
  }

  open(info) {
    this.active = true;
    this.series = StreamSeries.create({ originX: info.x, originY: info.y });
    this.segments.push(this.series);

    let streamEvent = StreamEvent.create('start', this._addContextToInfo(info));

    this.series.push(streamEvent);
    return streamEvent;
  }

  push(info) {
    let lastEvent = this.series.get(this.series.length - 1);
    let streamEvent = StreamEvent.create('move', this._addContextToInfo(info), lastEvent);

    this.series.push(streamEvent);
    return streamEvent;
  }

  close(info) {
    this.active = false;
    let lastEvent = this.series.get(this.series.length - 1);
    let streamEvent = StreamEvent.create('end', this._addContextToInfo(info), lastEvent);

    this.series.push(streamEvent);

    this._isDestroying = true;
    new MacroTask(() => {
      this.destroy();
    });

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
    let lastEvent = this.series.get(this.series.length - 1);
    this.series = StreamSeries.create({ originX: lastEvent.x, originY: lastEvent.y });
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

  _addContextToInfo(info) {
    info.originX = this.originX;
    info.originY = this.originY;
    info.segmentOriginX = this.series.originX;
    info.segmentOriginY = this.series.originY;

    return info;
  }

  static create(values) {
    let stream = STREAM_POOL.pop();

    if (stream) {
      stream.init(values);
      return stream;
    }

    return new Stream(values);
  }

}
