import { availableInputs } from './utils/detection';
import assign from './utils/assign';

const DEFAULT_OPTIONS = {
  inputs: availableInputs()
};

export default class Manager {

  constructor(rootElement, options) {
    this.rootElement = rootElement || window;
    this.layers = new WeakMap();
    this._recognizedInputs = 0;
    this.isRecognizing = false;

    this.inputs = {};
    this.options = assign({}, DEFAULT_OPTIONS, options || {});

    if (this.options.inputs) {
      let inputs = Object.keys(this.options.inputs);

      for (let i = 0; i < inputs.length; i++) {
        let name = inputs[i];
        let InputClass = this.options.inputs[name];

        this.registerInput(name, InputClass);
      }
    }

  }

  registerInput(name, InputClass) {
    this.inputs[name] = new InputClass(this.rootElement, this);
  }

  recognize(input, streams, stream, streamEvent) {
    let layer = this._findParentLayer(streamEvent.element);

    while (layer) {
      if (layer.recognize(input, streams, stream, streamEvent)) {
        this.startInputRecognition();
        break;
      }
      layer = layer.parent;
    }

    if (this.isRecognizing && streamEvent.name === 'end') {
      this.endInputRecognition();
    }
  }

  startInputRecognition() {
    this._recognizedInputs++;
    if (this._recognizedInputs === 1) {
      this.isRecognizing = true;
      document.body.setAttribute('gesture-no-touch', 'true');
    }
  }

  endInputRecognition() {
    this._recognizedInputs--;
    if (this._recognizedInputs === 0) {
      this.isRecognizing = false;
      document.body.removeAttribute('gesture-no-touch');
    }
  }

  unregisterInput(name) {
    let input = this.inputs[name];

    if (input) {
      this.inputs[name] = null;
      input.destroy();
    }
  }

  registerLayer(layer) {
    layer.element.setAttribute('gesture-layer', true);
    this.layers.set(layer.element, layer);

    layer.parent = this._findParentLayer(layer.element.parentNode);

    // insert into linked layer list
    if (layer.parent) {
      layer.child = layer.parent.child;
      layer.parent.child = layer;
    }
  }

  forgetLayer(layer) {
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

  _findParentLayer(element) {
    do {
      if (element && element.hasAttribute('gesture-layer')) {
        let layer = this.layers.get(element);

        if (layer) {
          return layer;
        }
      }
    } while (element && element !== document.body && (element = element.parentNode));

    return null;
  }

  _teardown() {
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
