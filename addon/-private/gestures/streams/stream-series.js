import FastArray from './fast-array';
import { MAX_ARRAY_SIZE } from './fast-array';

const STREAM_SERIES_POOL = new FastArray(10, 'StreamSeries Pool');

export default class StreamSeries extends FastArray {

  constructor() {
    super(...arguments);
    this._isDestroyed = false;
  }

  static create(number = MAX_ARRAY_SIZE, name = 'StreamEvent to List') {
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
