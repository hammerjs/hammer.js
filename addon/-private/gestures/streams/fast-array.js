export const MAX_ARRAY_LENGTH = 200;

export default class FastArray {

  constructor(length = MAX_ARRAY_LENGTH, name = 'Unknown Pool') {
    this.init(length, name);
  }

  init(length = MAX_ARRAY_LENGTH, name = 'Unknown Pool') {
    this.name = name;
    this.length = 0;
    this._length = length;
    this._data = new Array(length);
  }

  get(index) {
    if (index >= 0 && index < this.length) {
      return this._data[index];
    }

    return undefined;
  }

  forEach(cb) {
    for (let i = 0; i < this.length; i++) {
      cb(this._data[i], i);
    }
  }

  push(item) {
    let index = this.length++;

    if (index === this._length) {
      this._length *= 2;
      this._data.length = this._length;
    }

    this._data[index] = item;
  }

  pop() {
    let index = --this.length;

    if (index < 0) {
      this.length = 0;
      return undefined;
    }

    return this._data[index];
  }

}
