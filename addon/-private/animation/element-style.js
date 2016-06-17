import TransformStyle from './transform-style';
import CacheList from '../cache-list';
import ValueTransform from './value-transform';
import TRANSFORM_PROP from './utils/transform-prop';
import LAYOUT_PROPS from './utils/layout-props';

let ANIMATION_ID = 1;
const ANIMATION_KEY = 'eca';
const TRANSFORM_STYLES = ['x','y'];
const NUMERIC_STYLES = [
  'top' , 'left', 'right', 'bottom',
  'width', 'height'
];

export default class ElementStyle {

  constructor(values = {}, element) {
    this.init(values, element);
  }

  init(values, element) {
    this.changes = new CacheList();
    this.hasTransform = false;
    this.srcStyle = window.getComputedStyle(element);
    this.transformStyle = new TransformStyle(this.srcStyle.transform);
    this.setStyles(values);

    this.animationId = ANIMATION_ID++;
    this.elementId = element.id = element.id || `${ANIMATION_KEY}-${this.animationId}`;
  }

  setStyles(styles) {
    let keys = Object.keys(styles);

    for (let i = 0; i < keys.length; i++) {
      this.set(keys[i], styles[keys[i]]);
    }
  }

  set(prop, val) {
    if (TRANSFORM_STYLES.indexOf(prop) !== -1) {
      this._setTransform(prop, val);
    } else if (LAYOUT_PROPS.indexOf(prop) !== -1) {
      this._set(prop, val);
    } else {
      throw new Error('Invalid Style Property');
    }
  }

  _setTransform(prop, val) {
    this.hasTransform = true;
    let valueTransform = ElementStyle.parseNumber(val);

    this.transformStyle[prop] = valueTransform.affect(this.transformStyle[prop]);
  }

  _set(prop, val) {
    let cached = this.changes.get(prop);

    if (NUMERIC_STYLES.indexOf(prop) !== -1) {
      val = ElementStyle.parseNumber(val).affect(cached, true);
    }

    this.changes.set(prop, val);
  }

  applyStyles(element) {
    element = element || ElementStyle.getElement(this.elementId);

    if (!element) {
      return;
    }

    this.changes.forEach((value, key) => {
      element.style[key] = value || '';
    });

    if (this.hasTransform) {
      element.style[TRANSFORM_PROP] = this.transformStyle.toString();
    }
  }

  static getElement(id) {
    return document.getElementById(id);
  }

  static parseNumber(maybeNumber, canUseCalc = false) {
    return new ValueTransform(maybeNumber, canUseCalc);
  }

}
