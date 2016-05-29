import { availableInputs } from './detection';

const assign = Object.assign;
const DEFAULT_OPTIONS = {
  inputs: availableInputs()
};




export default class Manager {

  constructor(rootElement, options) {
    this.rootElement = rootElement || window;
    this.layers = new WeakMap();

    this.inputs = {};
    this.options = assign({}, DEFAULT_OPTIONS, options || {});

    for (let { name, InputClass } of this.options.inputs) {
      this.registerInput(name, InputClass);
    }

  }

  registerInput(name, InputClass) {
    this.inputs[name] = new InputClass(this.rootElement);
  }

  unregisterInput(name) {
    let input = this.inputs[name];

    if (input) {
      this.inputs[name] = null;
      input.destroy();
    }
  }

  register(layer) {
    this.layers.set(layer.element, layer);
    layer.parent = this._findParentLayer(layer.element);

    // insert into linked layer list
    if (layer.parent) {
      layer.child = layer.parent.child;
      layer.parent.child = layer;
    }
  }

  forget(layer) {
    this.layers.delete(layer.element);

    // join parent/child
    if (layer.parent && layer.child) {
      layer.parent.child = layer.child;

    // unlink parent/child
    } else {
      if (layer.parent) {
        layer.parent.child = null;
      }
      if (layer.child) {
        layer.child.parent = null;
      }
    }
  }

  private _findParentLayer(element) {
    do {
      if (element.hasAttribute('gesture-layer')) {
        let layer = this.layers.get(element);

        if (layer) {
          return layer;
        }
      }
    } while (element = element.parentNode);

    return null;
  }

  private _teardown() {
    this.streams.touch.destroy();
    this.streams.mouse.destroy();

    this.layers.forEach((layer) => {
      layer.destroy();
    });

    this.layers = null;
  }

  static create() {
    return new Manager();
  }

  destroy() {
    this._teardown();
  }

}
