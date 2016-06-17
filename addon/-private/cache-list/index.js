import EmptyObject from '../ember/empty-object';
const MAX_ARRAY_SIZE = 200;

export default class CacheList {

  constructor() {
    this.length = 0;
    this._indeces = new Array(MAX_ARRAY_SIZE);
    this._values = new Array(MAX_ARRAY_SIZE);
    this._map = undefined;
  }

  get(key) {
    if (this.length < MAX_ARRAY_SIZE) {
      let index = this._indeces.indexOf(key);

      if (index === -1) {
        return undefined;
      }

      return this._values[index];
    }

    return this._map.get(key);
  }

  set(key, value) {
    if (this.length < MAX_ARRAY_SIZE) {
      let index = this._indeces.indexOf(key);

      if (index !== -1) {
        this._values[index] = value;
        return;
      }

      index = this.length++;

      if (index !== MAX_ARRAY_SIZE) {
        this._indeces[index] = key;
        this._values[index] = value;
        return;
      }

      for (let i = 0; i < MAX_ARRAY_SIZE; i++) {
        this._map = typeof Map !== 'undefined' ? new Map() : new EmptyObject();
        this._map.set(this._indeces[i], this._values[i]);
      }
      this._indeces = undefined;
      this._values = undefined;
    }

    this._map.set(key, value);
  }

  remove(key) {
    if (this.length < MAX_ARRAY_SIZE) {
      let index = this._indeces.indexOf(key);

      if (index === -1) {
        return undefined;
      }

      let value = this._values[index];

      this._indeces[index] = undefined;
      this._values[index] = undefined;

      return value;
    }

    return this._map.remove(key);
  }

}
