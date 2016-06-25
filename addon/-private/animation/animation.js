import HashMap from 'perf-primitives/hash-map';
import ElementStyle from './element-style';

export default class Animation {

  constructor() {
    this.cache = new HashMap();
  }

  // We dumb
  to(element, time, styles, options) {
    this.setImmediate(element, styles);
    return Promise.resolve();
  }

  set(element, styles) {
    this.setImmediate(element, styles);
  }

  setImmediate(element, styles) {
    let meta = this.getElementMeta(element, styles);

    meta.applyStyles(element);
  }

  getElementMeta(element, styles) {
    let id = element.id;
    let meta;

    if (!id || !(meta = this.cache.get(id))) {
      meta = new ElementStyle(styles, element);
      this.cache.set(id, meta);
    } else {
      meta.setStyles(styles);
    }

    return meta;
  }

}
