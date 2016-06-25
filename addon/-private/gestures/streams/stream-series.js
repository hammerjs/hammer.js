import FastArray from 'perf-primitives/fast-array';
import { SMALL_ARRAY_LENGTH } from 'perf-primitives/-constants';

const STREAM_SERIES_POOL = new FastArray(10, 'StreamSeries Pool');

export default class StreamSeries extends FastArray {

  constructor(number = SMALL_ARRAY_LENGTH, name = 'StreamEvent to List') {
    super(number, name);
    this._isDestroyed = false;
  }

  static create(number = SMALL_ARRAY_LENGTH, name = 'StreamEvent to List') {
    let series = STREAM_SERIES_POOL.pop();

    if (series) {
      series.init(number, name);

      return series;
    }

    return new StreamSeries(number, name);
  }

  destroy() {
    if (!this._isDestroyed) {
      this._isDestroyed = true;

      for (let j = 0; j < this.length; j++) {
        this._data[j].destroy();
        this._data[j] = undefined;
      }

      STREAM_SERIES_POOL.push(this);
    }
  }

};
