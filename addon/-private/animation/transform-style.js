export const TRANSLATE_X_TEST = /translateX\(([^\)]+)\)/;
export const TRANSLATE_Y_TEST = /translateY\(([^\)]+)\)/;
export const TRANSLATE_TEST = /translate\(([^\),\s]+)(,\s*)?([^\)]*)?\)/;
export const MATRIX_TEST = /matrix\(([^\),\s]+),\s*([^\)]*),\s*([^\)]*),\s*([^\)]*),\s*([^\)]*),\s*([^\)]*)\)/;

export default class TransformStyle {

  constructor(transformString) {
    this.x = 0;
    this.y = 0;

    if (transformString) {
      this.fromString(transformString);
    }
  }

  fromString(str = '') {
    let match;
    // match translateY
    if (match = str.match(TRANSLATE_Y_TEST)) {
      this.y = match[1];
      return;
    }

    // match translateX
    if (match = str.match(TRANSLATE_X_TEST)) {
      this.x = match[1];
      return;
    }

    // match translate
    if (match = str.match(TRANSLATE_TEST)) {
      this.x = match[1];
      this.y = match[3];
      return;
    }

    // match matrix
    if (match = str.match(MATRIX_TEST)) {
      this.x = match[5];
      this.y = match[6];
      return;
    }

    // error out
    throw new Error('Unsupported Starting Transform');
  }

  toString() {
    if (!this.x) {
      if (!this.y) {
        return '';
      }

      return `translateY(${this.y})`;
    }

    if (this.y) {
      return `translate(${this.x}, ${this.y})`;
    }

    return `translateX(${this.y})`;
  }

}
