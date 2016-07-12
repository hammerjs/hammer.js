import Input from './inputs/input';
import Layer from './layer';
import Manager from './manager';
import Recognizer from './recognizer';

import MouseInput from './inputs/mouse';
import TouchInput from './inputs/touch';

import HorizontalPanRecognizer from './recognizers/horizontal-pan';
import VerticalPanRecognizer from './recognizers/vertical-pan';

// this prevents errors when Hammer is loaded in the presence of an AMD
// style loader but by script tag, not by the loader.

let Hammer = { // jshint ignore:line
  Input,
  Layer,
  Manager,
  Recognizer,

  MouseInput,
  TouchInput,

  HorizontalPanRecognizer,
  VerticalPanRecognizer
};

let freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

/* jshint ignore:start */
if (typeof define === 'function' && define.amd) {
  define(() => {
    return Hammer;
  });
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = Hammer;
} else {
  window[exportName] = Hammer;
}
/* jshint ignore:end */
