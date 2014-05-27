/**
 * Hammer instance for an element
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    this.inst = new Instance(element, options);
}

Hammer.version = '{{PKG_VERSION}}';
